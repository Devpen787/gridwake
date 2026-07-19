import { useEffect, useMemo, useState } from "react";
import type { LightRole } from "../game/types";
import { launchBlockReason } from "../multiplayer/room";
import type { RoomCommand, RoomState } from "../multiplayer/types";
import { CoreMark } from "./CoreMark";

type StripEnvelope<T> = T extends RoomCommand ? Omit<T, "id" | "actorId" | "baseSequence"> : never;
type LobbyCommand = StripEnvelope<RoomCommand>;

type LobbyScreenProps = Readonly<{
  actorId: string;
  state: RoomState;
  error: string | null;
  onCommand: (command: LobbyCommand) => void;
  onExit: () => void;
}>;

const ROLE_HELP: Record<LightRole, string> = {
  guardian: "SHAPE · RADIUS · MOVEMENT · PULSE",
  scout: "INTERCEPTORS · PURSUIT · RISK",
  mender: "LINK FOCUS · REPAIR CADENCE",
};

export function LobbyScreen({ actorId, state, error, onCommand, onExit }: LobbyScreenProps) {
  const member = state.members.find((candidate) => candidate.id === actorId);
  const [displayName, setDisplayName] = useState(member?.displayName ?? "");
  const [role, setRole] = useState<LightRole>(member?.role ?? "scout");
  const [source, setSource] = useState(member?.instinctSource ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!member) return;
    setDisplayName(member.displayName);
    setRole(member.role);
    setSource(member.instinctSource);
  }, [member?.displayName, member?.instinctSource, member?.role]);

  const takenRoles = useMemo(() => new Set(state.members.filter((candidate) => candidate.id !== actorId).map((candidate) => candidate.role)), [actorId, state.members]);
  const blockReason = launchBlockReason(state, actorId);
  const invite = `${window.location.origin}${window.location.pathname}?room=${state.code}`;

  if (!member) {
    return (
      <section className="lobby screen lobby--connecting">
        <CoreMark active size="large" />
        <p>CONTACTING ROOM {state.code}…</p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="secondary-action" type="button" onClick={onExit}>EXIT</button>
      </section>
    );
  }

  if (state.phase === "launched") {
    return (
      <section className="lobby screen lobby--connecting" aria-label="Round already in progress">
        <CoreMark active size="large" />
        <p>ROUND {state.code} IS ALREADY IN PROGRESS.</p>
        <small>LIVE REJOIN IS FROZEN TO PREVENT A DIVERGENT RESULT.</small>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="secondary-action" type="button" onClick={onExit}>LEAVE ROOM</button>
      </section>
    );
  }

  const toggleReady = () => {
    if (member.ready) {
      onCommand({ type: "set-ready", ready: false });
      return;
    }
    onCommand({ type: "configure", displayName, role, source, ready: true });
  };

  return (
    <section className="lobby screen" aria-labelledby="lobby-title">
      <header className="screen-header">
        <button className="text-action" type="button" onClick={onExit}>← EXIT</button>
        <span>ROOM / {state.code}</span>
        <span className="truth-label truth-label--inline">P2P HOST LOG</span>
      </header>

      <div className="lobby__content">
        <div className="lobby__heading">
          <CoreMark size="small" />
          <div>
            <p className="step-index">ASSEMBLE THE SQUAD</p>
            <h1 id="lobby-title">THREE ROLES. ONE INSTINCT.</h1>
            <p>Each player writes one part. Your role owns its dials—nobody else's sentence can move them.</p>
          </div>
        </div>

        <div className="invite-strip">
          <span>ROOM CODE</span>
          <strong>{state.code}</strong>
          <button type="button" onClick={() => navigator.clipboard.writeText(invite).then(() => setCopied(true))}>{copied ? "COPIED" : "COPY INVITE"}</button>
        </div>

        <div className="lobby__grid">
          <div className="roster" aria-label="Room roster">
            <div className="panel-label">SQUAD · {state.members.length} / 3</div>
            {state.members.map((candidate) => (
              <article className={`roster-member roster-member--${candidate.role}`} key={candidate.id}>
                <span>{candidate.role.toUpperCase()}</span>
                <strong>{candidate.displayName}{candidate.id === state.hostId ? " · HOST" : ""}</strong>
                <small>{candidate.ready ? "READY" : candidate.connection.toUpperCase()}</small>
              </article>
            ))}
            {Array.from({ length: 3 - state.members.length }).map((_, index) => <div className="roster-empty" key={index}>WAITING FOR LIGHT…</div>)}
          </div>

          <div className="instinct-console">
            <div className="panel-label">YOUR LIGHT</div>
            <label className="room-field room-field--inline">
              <span>CALLSIGN</span>
              <input maxLength={24} disabled={member.ready} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <div className="role-picker" role="group" aria-label="Choose your role">
              {(["guardian", "scout", "mender"] as const).map((candidate) => (
                <button
                  type="button"
                  key={candidate}
                  disabled={member.ready || takenRoles.has(candidate)}
                  className={role === candidate ? "is-selected" : ""}
                  onClick={() => setRole(candidate)}
                >
                  <span>{candidate.toUpperCase()}</span>
                  <small>{ROLE_HELP[candidate]}</small>
                </button>
              ))}
            </div>
            <label className="room-field room-field--instinct">
              <span>YOUR PART OF THE INSTINCT</span>
              <textarea
                rows={4}
                maxLength={280}
                disabled={member.ready}
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Circle close to the core and break formation only for immediate threats."
              />
              <small>{source.length} / 280</small>
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className={member.ready ? "secondary-action" : "primary-action"} type="button" onClick={toggleReady}>
              {member.ready ? "UNLOCK INSTINCT" : "LOCK + READY"}
            </button>
          </div>
        </div>
      </div>

      <footer className="lobby__launch">
        <span>{blockReason ?? "THE GRID IS READY"}</span>
        <button
          className="primary-action"
          type="button"
          disabled={blockReason !== null}
          onClick={() => onCommand({ type: "launch", startsAt: Date.now() + 1_500 })}
        >
          WAKE TOGETHER →
        </button>
      </footer>
    </section>
  );
}
