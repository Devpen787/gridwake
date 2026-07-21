import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AwakeningScreen } from "./components/AwakeningScreen";
import { GameScreen } from "./components/GameScreen";
import { LandingScreen } from "./components/LandingScreen";
import { LobbyScreen } from "./components/LobbyScreen";
import { ProgramScreen } from "./components/ProgramScreen";
import { ResultScreen } from "./components/ResultScreen";
import { RoomEntryScreen } from "./components/RoomEntryScreen";
import { CampaignScreen } from "./components/CampaignScreen";
import { RecordsScreen } from "./components/RecordsScreen";
import { createInitialState, createReceipt } from "./game/engine";
import { allowPossessionForMode } from "./game/possession";
import { nextLevel, type CampaignLevel } from "./game/campaign";
import { loadRounds } from "./game/records";
import type { CompiledStrategy, EngineState, RoundReceipt } from "./game/types";
import { createRoom, normalizeRoomCode, roomCodeFromEntropy } from "./multiplayer/room";
import type { PeerRoomCommand, PeerRoomSession } from "./multiplayer/peerTransport";
import type { RoomState } from "./multiplayer/types";
import { CoreMark } from "./components/CoreMark";
import { PolicyScreen, type PolicyKind } from "./components/PolicyScreen";
import { clearRoomRecovery, readRoomRecovery, saveRoomRecovery } from "./multiplayer/recovery";

type AppStage = "landing" | "campaign" | "records" | "room-entry" | "lobby" | "program" | "awakening" | "playing" | "result" | "policy";

export function seedForRound(roundNumber: number): number {
  return (0x9e3779b9 + Math.imul(roundNumber, 7_919)) >>> 0;
}

export function App() {
  const [stage, setStage] = useState<AppStage>("landing");
  const [strategy, setStrategy] = useState<CompiledStrategy | null>(null);
  const [roundState, setRoundState] = useState<EngineState | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundSeedOverride, setRoundSeedOverride] = useState<number | null>(null);
  const [previousReceipt, setPreviousReceipt] = useState<RoundReceipt | null>(null);
  const [roomMode, setRoomMode] = useState<"create" | "join">("create");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [roomActorId, setRoomActorId] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [scheduledPulseTick, setScheduledPulseTick] = useState<number | null>(null);
  const [verifiedCheckpointTick, setVerifiedCheckpointTick] = useState<number | null>(null);
  const [activeLevel, setActiveLevel] = useState<CampaignLevel | null>(null);
  const [policyKind, setPolicyKind] = useState<PolicyKind>("terms");
  const [policyReturnStage, setPolicyReturnStage] = useState<AppStage>("landing");
  const roomSession = useRef<PeerRoomSession | null>(null);
  const initialRoomCode = useMemo(() => normalizeRoomCode(new URLSearchParams(window.location.search).get("room") ?? ""), []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [stage]);

  useEffect(() => {
    if (initialRoomCode.length !== 6) return;
    setRoomMode("join");
    setStage("room-entry");
  }, [initialRoomCode]);

  const beginProgram = useCallback(() => {
    setActiveLevel(null);
    setStage("program");
  }, []);
  const beginCampaign = useCallback(() => setStage("campaign"), []);
  const beginRecords = useCallback(() => setStage("records"), []);
  const selectLevel = useCallback((level: CampaignLevel) => {
    setActiveLevel(level);
    setPreviousReceipt(null);
    setRoundSeedOverride(null);
    setStage("program");
  }, []);
  const beginCreateRoom = useCallback(() => {
    setRoomMode("create");
    setRoomError(null);
    setScheduledPulseTick(null);
    setVerifiedCheckpointTick(null);
    setStage("room-entry");
  }, []);
  const beginJoinRoom = useCallback(() => {
    setRoomMode("join");
    setRoomError(null);
    setStage("room-entry");
  }, []);
  const openPolicy = useCallback((kind: PolicyKind) => {
    setPolicyKind(kind);
    setPolicyReturnStage(stage);
    setStage("policy");
  }, [stage]);

  const awaken = useCallback((compiled: CompiledStrategy) => {
    setStrategy(compiled);
    setStage("awakening");
  }, []);

  const launch = useCallback(() => {
    if (!strategy) return;
    const seed = roundSeedOverride ?? activeLevel?.seed ?? seedForRound(roundNumber);
    setRoundState(activeLevel && roundSeedOverride === null
      ? createInitialState(seed, strategy, activeLevel.maxTicks)
      : createInitialState(seed, strategy));
    setStage("playing");
  }, [activeLevel, roundNumber, roundSeedOverride, strategy]);

  const resolveRound = useCallback((resolved: EngineState) => {
    setRoundState(resolved);
    setStage("result");
  }, []);

  const newGrid = useCallback(() => {
    setPreviousReceipt(null);
    setRoundState(null);
    if (activeLevel) {
      setStage("campaign");
      return;
    }
    setRoundNumber((current) => current + 1);
    setStage("program");
  }, [activeLevel]);

  const advanceToNextLevel = useCallback(() => {
    if (!activeLevel) return;
    const following = nextLevel(loadRounds(), activeLevel);
    setPreviousReceipt(null);
    setRoundState(null);
    if (!following) {
      setStage("campaign");
      return;
    }
    setActiveLevel(following);
    setStage("program");
  }, [activeLevel]);

  const tuneSameGrid = useCallback(() => {
    if (roundState?.ended && strategy) {
      setPreviousReceipt(createReceipt(roundState, strategy));
    }
    setRoundState(null);
    setStage("program");
  }, [roundState, strategy]);

  const returnHome = useCallback(() => {
    const code = roomState?.code;
    roomSession.current?.close();
    roomSession.current = null;
    setStrategy(null);
    setRoundState(null);
    setPreviousReceipt(null);
    setRoundSeedOverride(null);
    setActiveLevel(null);
    setRoomState(null);
    setRoomActorId(null);
    setRoomError(null);
    if (code) clearRoomRecovery(code);
    window.history.replaceState({}, "", window.location.pathname);
    setStage("landing");
  }, [roomState?.code]);

  const enterRoom = useCallback(async (displayName: string, codeInput: string) => {
    const now = Date.now();
    let initialState: RoomState | null;
    let code: string;
    let actorId: string;

    if (roomMode === "create") {
      const entropy = crypto.getRandomValues(new Uint32Array(1))[0] ^ now;
      code = roomCodeFromEntropy(entropy);
      actorId = crypto.randomUUID();
      initialState = createRoom({
        roomId: crypto.randomUUID(),
        code,
        hostId: actorId,
        displayName,
        createdAt: now,
      });
    } else {
      code = normalizeRoomCode(codeInput);
      if (code.length !== 6) {
        setRoomError("Enter the six-character room code.");
        return;
      }
      const recovery = readRoomRecovery(code);
      actorId = recovery?.actorId ?? crypto.randomUUID();
      initialState = recovery?.state.phase === "lobby" && recovery.state.hostId === actorId ? recovery.state : null;
    }

    roomSession.current?.close();
    setRoomActorId(actorId);
    setRoomState(initialState);
    setRoomError(null);
    window.history.replaceState({}, "", `${window.location.pathname}?room=${code}`);
    const { PeerRoomSession: PeerRoomSessionRuntime } = await import("./multiplayer/peerTransport");
    const session = new PeerRoomSessionRuntime({
      actorId,
      displayName,
      code,
      initialState,
      onError: setRoomError,
      onPulse: (event) => setScheduledPulseTick(event.executeAtTick),
      onCheckpoint: (tick, matched) => {
        if (matched) setVerifiedCheckpointTick(tick);
        else setRoomError(`DESYNC DETECTED AT TICK ${tick}. RESULT UNVERIFIED.`);
      },
      onState: (nextState) => {
        setRoomState(nextState);
        saveRoomRecovery(actorId, nextState);
        if (nextState.phase === "launched" && nextState.launch) {
          if (Date.now() > nextState.launch.startsAt + 5_000) {
            setRoomError("This round is already live. Rejoining mid-round is disabled to protect replay integrity.");
            return;
          }
          setStrategy(nextState.launch.strategy);
          setRoundSeedOverride(nextState.launch.seed);
          setStage("awakening");
        }
      },
    });
    roomSession.current = session;
    setStage("lobby");
  }, [roomMode]);

  const sendRoomCommand = useCallback((command: PeerRoomCommand) => {
    setRoomError(null);
    roomSession.current?.submit(command);
  }, []);

  const backgroundLabel = useMemo(() => {
    if (stage === "playing") return "GRIDWAKE live arena";
    if (stage === "result") return "GRIDWAKE resolved round";
    return "GRIDWAKE prototype";
  }, [stage]);

  return (
    <main className={`app app--${stage}`} aria-label={backgroundLabel}>
      <div className="ambient-grid" aria-hidden="true" />
      {stage === "landing" ? (
        <LandingScreen
          onSolo={beginProgram}
          onCampaign={beginCampaign}
          onRecords={beginRecords}
          onCreateRoom={beginCreateRoom}
          onJoinRoom={beginJoinRoom}
          onPolicy={openPolicy}
        />
      ) : null}
      {stage === "campaign" ? (
        <CampaignScreen onBack={returnHome} onSelect={selectLevel} />
      ) : null}
      {stage === "records" ? (
        <RecordsScreen onBack={returnHome} />
      ) : null}
      {stage === "room-entry" ? (
        <RoomEntryScreen
          mode={roomMode}
          initialCode={initialRoomCode}
          error={roomError}
          onBack={returnHome}
          onSubmit={enterRoom}
          onPolicy={openPolicy}
        />
      ) : null}
      {stage === "policy" ? <PolicyScreen kind={policyKind} onBack={() => setStage(policyReturnStage)} /> : null}
      {stage === "lobby" && roomState && roomActorId ? (
        <LobbyScreen
          actorId={roomActorId}
          state={roomState}
          error={roomError}
          onCommand={sendRoomCommand}
          onExit={returnHome}
        />
      ) : null}
      {stage === "lobby" && !roomState ? (
        <section className="lobby screen lobby--connecting" aria-label="Connecting to peer room">
          <CoreMark active size="large" />
          <p>FINDING ROOM {normalizeRoomCode(new URLSearchParams(window.location.search).get("room") ?? "")}…</p>
          <small>ENCRYPTED PEER DISCOVERY · NO DATABASE</small>
          {roomError ? <p className="form-error" role="alert">{roomError}</p> : null}
          <button className="secondary-action" type="button" onClick={returnHome}>EXIT</button>
        </section>
      ) : null}
      {stage === "program" ? (
        <ProgramScreen
          initialSource={strategy?.source ?? ""}
          level={activeLevel}
          onBack={activeLevel ? beginCampaign : returnHome}
          onConfirm={awaken}
        />
      ) : null}
      {stage === "awakening" && strategy ? (
        <AwakeningScreen strategy={strategy} onComplete={launch} />
      ) : null}
      {stage === "playing" && roundState ? (
        <GameScreen
          initialState={roundState}
          modeLabel={roomState ? `ROOM ${roomState.code} · ${roomState.members.length} LIGHTS` : undefined}
          authorityLabel={roomState ? verifiedCheckpointTick === null ? "P2P HOST LOG · ORDERED INPUT" : `P2P VERIFIED · T${verifiedCheckpointTick}` : undefined}
          allowPossess={allowPossessionForMode(roomState ? "multiplayer" : "solo")}
          scheduledPulseTick={roomState ? scheduledPulseTick : null}
          onPulseRequest={roomState ? (tick) => roomSession.current?.requestPulse(tick) : undefined}
          onTick={roomState ? (tick) => roomSession.current?.updateTick(tick) : undefined}
          onCheckpoint={roomState ? (tick, replayHash) => roomSession.current?.reportCheckpoint(tick, replayHash) : undefined}
          onResolved={resolveRound}
        />
      ) : null}
      {stage === "result" && roundState && strategy ? (
        <ResultScreen
          state={roundState}
          strategy={strategy}
          previousReceipt={roomState ? null : previousReceipt}
          level={roomState ? null : activeLevel}
          onNextLevel={advanceToNextLevel}
          onLeave={returnHome}
          onNewGrid={newGrid}
          onTuneSameGrid={tuneSameGrid}
          multiplayer={roomState !== null}
          truthLabel={roomState ? "P2P CHECKPOINTED RECEIPT · NOT SERVER SIGNED" : undefined}
          statusLabel={roomState ? verifiedCheckpointTick === null ? "P2P / UNVERIFIED" : `P2P VERIFIED T${verifiedCheckpointTick}` : undefined}
        />
      ) : null}
    </main>
  );
}
