import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { gameAudio } from "../audio/audioDirector";
import {
  activatePulse,
  advanceTick,
  phaseForTick,
  pulseGuidance,
  queueManualIntent,
  setPossession,
  threatLevel,
  worstSector,
} from "../game/engine";
import {
  OVERRIDE_MAX_TICKS,
  PULSE_CLEAR_CAP,
  TICK_RATE,
  type EngineState,
  type GameEvent,
  type ManualIntent,
  type RoundPhase,
} from "../game/types";
import { AudioToggle } from "./AudioToggle";
import {
  ControlsHint,
  markControlsHintSeen,
  shouldShowControlsHint,
} from "./ControlsHint";
import { EventToast } from "./EventToast";
import { MobileControls } from "./MobileControls";
import { PixiArena } from "./PixiArena";

type GameScreenProps = Readonly<{
  initialState: EngineState;
  modeLabel?: string;
  authorityLabel?: string;
  allowPossess?: boolean;
  scheduledPulseTick?: number | null;
  onPulseRequest?: (tick: number) => void;
  onTick?: (tick: number, replayHash: number) => void;
  onCheckpoint?: (tick: number, replayHash: number) => void;
  onResolved: (state: EngineState) => void;
}>;

type KickKind = "damage" | "pulse" | null;

const HEALTH_SEGMENTS = 10;
const PHASE_TOAST_MS = 1_050;

const PHASE_MESSAGES: Readonly<Record<Exclude<RoundPhase, "probe">, string>> = {
  surge: "SURGE · BOUNDARY PRESSURE RISING",
  collapse: "COLLAPSE · CORE UNDER SIEGE",
};

function formatTimer(ticksRemaining: number): string {
  const seconds = Math.max(0, Math.ceil(ticksRemaining / TICK_RATE));
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function currentIntention(state: EngineState): string {
  const possessed = state.lights.find((light) => light.id === state.possessedLightId);
  if (possessed) return possessed.intention;
  const intercepting = state.lights.find((light) => light.mode === "intercept");
  if (intercepting) return intercepting.intention;
  return state.lights[0]?.intention ?? "HOLD FORMATION";
}

function colorCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function possessLabel(state: EngineState): string | null {
  if (state.possessedLightId === null) return null;
  const index = state.lights.findIndex((light) => light.id === state.possessedLightId);
  if (index < 0) return null;
  const light = state.lights[index];
  return `POSSESS · ${index + 1} · ${light.role.toUpperCase()}`;
}

function intentFromKeys(keys: ReadonlySet<string>): ManualIntent | null {
  if (keys.has("ArrowUp") || keys.has("KeyW")) return { dx: 0, dy: -1 };
  if (keys.has("ArrowDown") || keys.has("KeyS")) return { dx: 0, dy: 1 };
  if (keys.has("ArrowLeft") || keys.has("KeyA")) return { dx: -1, dy: 0 };
  if (keys.has("ArrowRight") || keys.has("KeyD")) return { dx: 1, dy: 0 };
  return null;
}

function healthBand(health: number): "high" | "mid" | "low" | "critical" {
  if (health > 70) return "high";
  if (health > 40) return "mid";
  if (health > 20) return "low";
  return "critical";
}

export function GameScreen({
  initialState,
  modeLabel = "SOLO ARCHITECT",
  authorityLabel = "LOCAL / DETERMINISTIC",
  allowPossess = true,
  scheduledPulseTick = null,
  onPulseRequest,
  onTick,
  onCheckpoint,
  onResolved,
}: GameScreenProps) {
  const [state, setState] = useState(initialState);
  const [kick, setKick] = useState<KickKind>(null);
  const [pulseKick, setPulseKick] = useState(false);
  const [showControlsHint, setShowControlsHint] = useState(() => shouldShowControlsHint());
  const [phaseToast, setPhaseToast] = useState<GameEvent | null>(null);
  const resolvedRef = useRef(false);
  const keysRef = useRef(new Set<string>());
  const lastDamageRef = useRef(initialState.damageTaken);
  const lastPulseUsedRef = useRef(initialState.pulse.usedAtTick);
  const lastSoundEventRef = useRef<string | null>(null);
  const lastPossessedSoundRef = useRef(initialState.possessedLightId);
  const phaseRef = useRef(phaseForTick(initialState.tick));

  const dismissControlsHint = useCallback(() => {
    markControlsHintSeen();
    setShowControlsHint(false);
  }, []);

  useEffect(() => {
    if (!showControlsHint) return;
    const timeout = window.setTimeout(dismissControlsHint, 7_000);
    return () => window.clearTimeout(timeout);
  }, [dismissControlsHint, showControlsHint]);

  useEffect(() => {
    const event = state.lastEvent;
    if (!event) return;
    const key = `${event.tick}:${event.kind}:${event.message}`;
    if (lastSoundEventRef.current === key) return;
    lastSoundEventRef.current = key;

    const sound = event.kind === "damage"
      ? "damage"
      : event.kind === "repair"
        ? "repair"
        : event.kind === "intercept"
          ? "intercept"
          : event.kind === "pulse"
            ? "pulse"
            : "warning";
    gameAudio.play(sound);
  }, [state.lastEvent]);

  useEffect(() => {
    if (
      state.possessedLightId !== null
      && state.possessedLightId !== lastPossessedSoundRef.current
    ) {
      gameAudio.play("possess");
    }
    lastPossessedSoundRef.current = state.possessedLightId;
  }, [state.possessedLightId]);

  useEffect(() => {
    const phase = phaseForTick(state.tick);
    if (phase === phaseRef.current) return;
    phaseRef.current = phase;
    if (phase === "probe") return;
    setPhaseToast({
      tick: state.tick,
      kind: "phase",
      message: PHASE_MESSAGES[phase],
    });
    gameAudio.play(phase === "surge" ? "phase-surge" : "phase-collapse");
  }, [state.tick]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let accumulated = 0;
    const stepMs = 1_000 / TICK_RATE;
    const loop = (now: number) => {
      accumulated = Math.min(500, accumulated + (now - previous));
      previous = now;
      while (accumulated >= stepMs) {
        setState((current) => {
          let next = current;
          if (allowPossess && next.possessedLightId) {
            const intent = intentFromKeys(keysRef.current);
            if (intent) next = queueManualIntent(next, intent);
          }
          const advanced = advanceTick(next);
          if (scheduledPulseTick !== null && current.tick < scheduledPulseTick && advanced.tick >= scheduledPulseTick) {
            return activatePulse(advanced);
          }
          return advanced;
        });
        accumulated -= stepMs;
      }
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [allowPossess, scheduledPulseTick]);

  useEffect(() => {
    onTick?.(state.tick, state.replayHash);
    if (state.tick % 50 === 0) onCheckpoint?.(state.tick, state.replayHash);
  }, [onCheckpoint, onTick, state.replayHash, state.tick]);

  useEffect(() => {
    if (scheduledPulseTick === null) return;
    setState((current) => current.pulse.available && current.tick >= scheduledPulseTick ? activatePulse(current) : current);
  }, [scheduledPulseTick]);

  useEffect(() => {
    if (!state.ended || resolvedRef.current) return;
    resolvedRef.current = true;
    const timeout = window.setTimeout(() => onResolved(state), 700);
    return () => window.clearTimeout(timeout);
  }, [onResolved, state]);

  useEffect(() => {
    if (state.damageTaken > lastDamageRef.current) {
      setKick("damage");
    }
    lastDamageRef.current = state.damageTaken;
  }, [state.damageTaken]);

  useEffect(() => {
    if (state.pulse.usedAtTick !== null && state.pulse.usedAtTick !== lastPulseUsedRef.current) {
      setKick("pulse");
      setPulseKick(true);
    }
    lastPulseUsedRef.current = state.pulse.usedAtTick;
  }, [state.pulse.usedAtTick]);

  useEffect(() => {
    if (kick === null) return;
    const timeout = window.setTimeout(() => setKick(null), 160);
    return () => window.clearTimeout(timeout);
  }, [kick]);

  useEffect(() => {
    if (!pulseKick) return;
    const timeout = window.setTimeout(() => setPulseKick(false), 220);
    return () => window.clearTimeout(timeout);
  }, [pulseKick]);

  const pulse = useCallback(() => {
    dismissControlsHint();
    if (onPulseRequest) {
      onPulseRequest(state.tick);
      return;
    }
    setState((current) => activatePulse(current));
  }, [dismissControlsHint, onPulseRequest, state.tick]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if (event.code === "Space") {
        event.preventDefault();
        dismissControlsHint();
        pulse();
        return;
      }
      if (!allowPossess || state.ended) return;
      if (event.code === "Escape") {
        event.preventDefault();
        dismissControlsHint();
        setState((current) => setPossession(current, null));
        return;
      }
      if (event.code === "Digit1" || event.code === "Digit2" || event.code === "Digit3") {
        event.preventDefault();
        dismissControlsHint();
        const index = Number(event.code.slice(-1)) - 1;
        setState((current) => {
          const light = current.lights[index];
          if (!light) return current;
          return setPossession(current, current.possessedLightId === light.id ? null : light.id);
        });
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
        event.preventDefault();
        dismissControlsHint();
        keysRef.current.add(event.code);
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      keysRef.current.delete(event.code);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [allowPossess, dismissControlsHint, pulse, state.ended]);

  const threat = useMemo(() => threatLevel(state.corruption), [state.corruption]);
  const sector = useMemo(() => worstSector(state.corruption), [state.corruption]);
  const guidance = pulseGuidance(state.health, threat, state.policy.pulseHealthThreshold);
  const intention = currentIntention(state);
  const possessCue = possessLabel(state);
  const band = healthBand(state.health);
  const filledSegments = Math.max(0, Math.ceil((state.health / 100) * HEALTH_SEGMENTS));
  const phase = phaseForTick(state.tick);
  const overrideSpent = state.overrideTicksRemaining <= 0;
  const overrideRatio = state.overrideTicksRemaining / OVERRIDE_MAX_TICKS;

  return (
    <section
      className={[
        "game",
        "screen",
        `game--phase-${phase}`,
        `game--${guidance.toLowerCase()}`,
        `game--event-${state.lastEvent?.kind ?? "idle"}`,
        `game--health-${band}`,
        kick ? `game--kick-${kick}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Live GRIDWAKE round"
    >
      <div className="pixi-arena-shell">
        <PixiArena state={state} />
        <div className="phosphor-overlay" aria-hidden="true" />
      </div>
      <EventToast event={state.lastEvent} />
      <EventToast event={phaseToast} durationMs={PHASE_TOAST_MS} />
      <ControlsHint
        visible={showControlsHint}
        allowPossess={allowPossess}
        onDismiss={dismissControlsHint}
      />
      <AudioToggle />
      {allowPossess ? (
        <MobileControls
          lights={state.lights}
          possessedLightId={state.possessedLightId}
          disabled={state.ended || (overrideSpent && state.possessedLightId === null)}
          onPossess={(lightId) => {
            dismissControlsHint();
            setState((current) => setPossession(current, lightId));
          }}
          onMove={(intent) => {
            dismissControlsHint();
            setState((current) => queueManualIntent(current, intent));
          }}
        />
      ) : null}
      <header className="game-hud game-hud--top">
        <div className={`health-readout health-readout--${band}`}>
          <span>CORE HEALTH</span>
          <strong>{state.health.toString().padStart(2, "0")} / 100</strong>
          <div className="health-track health-track--segmented" aria-hidden="true">
            {Array.from({ length: HEALTH_SEGMENTS }, (_, index) => (
              <span
                key={index}
                className={`health-segment${index < filledSegments ? " health-segment--on" : ""}`}
              />
            ))}
          </div>
        </div>
        <time>{formatTimer(state.maxTicks - state.tick)}</time>
        <div className="round-truth">
          <span>{modeLabel}</span>
          <strong>{authorityLabel}</strong>
        </div>
      </header>
      <footer className="game-hud game-hud--bottom">
        {allowPossess ? (
          <div
            className={`possess-roster${possessCue ? " possess-roster--engaged" : ""}${overrideSpent ? " possess-roster--spent" : ""}`}
            role="group"
            aria-label="Light possession"
          >
            <div className="possess-roster__header">
              <span className="possess-roster__label">
                {possessCue ? "MANUAL OVERRIDE · WASD STEP · ESC RELEASE" : "POSSESS"}
              </span>
              <div
                className="override-meter"
                role="meter"
                aria-label="Override energy"
                aria-valuemin={0}
                aria-valuemax={OVERRIDE_MAX_TICKS}
                aria-valuenow={state.overrideTicksRemaining}
              >
                <span>OVERRIDE</span>
                <div className="override-meter__track" aria-hidden="true">
                  <span style={{ width: `${overrideRatio * 100}%` }} />
                </div>
                <strong>{Math.ceil(state.overrideTicksRemaining / TICK_RATE)}s</strong>
              </div>
            </div>
            <div className="possess-roster__keys">
              {state.lights.map((light, index) => {
                const selected = light.id === state.possessedLightId;
                return (
                  <button
                    key={light.id}
                    type="button"
                    className={`possess-key${selected ? " possess-key--active" : ""}`}
                    style={{ "--light-color": colorCss(light.color) } as CSSProperties}
                    aria-label={`${selected ? "Release" : "Possess"} light ${index + 1}, ${light.role}`}
                    aria-pressed={selected}
                    disabled={state.ended || (overrideSpent && !selected)}
                    onClick={() => {
                      dismissControlsHint();
                      setState((current) =>
                        setPossession(current, selected ? null : light.id),
                      );
                    }}
                  >
                    <strong>{index + 1}</strong>
                    <span className="possess-key__swatch" aria-hidden="true" />
                    <small>{light.role.toUpperCase()}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <p className={`current-intention${possessCue ? " current-intention--possess" : ""}`}>
          <span>{possessCue ? "ENGAGED" : "CURRENT INTENTION"}</span>
          <strong>{possessCue ?? intention}</strong>
        </p>
        <button
          className={[
            "pulse-action",
            state.pulse.available ? "" : "pulse-action--spent",
            `pulse-action--${guidance.toLowerCase()}`,
            pulseKick ? "pulse-action--kick" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          type="button"
          onClick={pulse}
          disabled={!state.pulse.available || state.ended || scheduledPulseTick !== null}
        >
          <span>
            {scheduledPulseTick !== null && state.pulse.available
              ? "PULSE QUEUED"
              : state.pulse.available
                ? "PULSE [ SPACE ]"
                : "PULSE SPENT"}
          </span>
          <small>
            {scheduledPulseTick !== null && state.pulse.available
              ? `T+${Math.max(0, scheduledPulseTick - state.tick)}`
              : state.pulse.available
                ? guidance
                : `${state.pulse.cleared} CLEARED · ≤${PULSE_CLEAR_CAP}`}
          </small>
        </button>
      </footer>
      <div className="screen-reader-state" aria-live="polite">
        Core health {state.health}. {Math.ceil((state.maxTicks - state.tick) / TICK_RATE)} seconds remain.
        Threat {threat}. Sector {sector + 1}. Pulse {state.pulse.available ? guidance.toLowerCase() : "spent"}.
        Intention {intention}. Phase {phase}.
        Override {state.overrideTicksRemaining} ticks remain.
        {possessCue ? ` ${possessCue}. Use WASD to move. Escape to release.` : allowPossess ? " Press 1 2 or 3 to possess a light." : ""}
      </div>
    </section>
  );
}
