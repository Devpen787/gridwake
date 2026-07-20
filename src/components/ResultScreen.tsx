import { useEffect, useMemo, useRef, useState } from "react";
import { gameAudio } from "../audio/audioDirector";
import { recommendationFor, resultSummary } from "../game/analysis";
import {
  compareReceipts,
  deltaTone,
  formatReceiptShareText,
  formatSignedDelta,
} from "../game/comparison";
import { createReceipt } from "../game/engine";
import type {
  AttributionEntry,
  AttributionSource,
  CompiledStrategy,
  EngineState,
  RoundReceipt,
} from "../game/types";
import { AudioToggle } from "./AudioToggle";
import { PixiArena } from "./PixiArena";

type ResultScreenProps = Readonly<{
  state: EngineState;
  strategy: CompiledStrategy;
  previousReceipt?: RoundReceipt | null;
  onTuneSameGrid: () => void;
  onNewGrid: () => void;
  onLeave: () => void;
  multiplayer?: boolean;
  truthLabel?: string;
  statusLabel?: string;
}>;

type HeroStat = Readonly<{
  label: string;
  value: number;
}>;

type CausalTraceEntry = Readonly<{
  label: string;
  detail: string;
  source: AttributionSource;
}>;

type CopyState = "idle" | "copied" | "error";

const SOURCE_LABELS: Record<AttributionSource, string> = {
  player: "YOUR WORDS",
  inferred: "COMPILER INFERENCE",
  default: "DEFAULT",
  override: "OVERRIDE",
  pulse: "PULSE",
};

function sourceTone(source: AttributionSource): string {
  switch (source) {
    case "player":
      return "player";
    case "inferred":
      return "inferred";
    case "default":
      return "default";
    case "override":
      return "override";
    case "pulse":
      return "pulse";
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

function attributionToTrace(entries: readonly AttributionEntry[]): readonly CausalTraceEntry[] {
  return entries.map((entry) => ({
    label: entry.action,
    detail: entry.evidence ? `${entry.detail} · ${entry.evidence}` : entry.detail,
    source: entry.source,
  }));
}

function fallbackTrace(state: EngineState, strategy: CompiledStrategy): readonly CausalTraceEntry[] {
  const interpretation = strategy.interpretation;
  if (!interpretation) return [];

  const entries: CausalTraceEntry[] = [];

  for (const evidence of interpretation.evidenceByDirective) {
    const directive = interpretation.plan.directives[evidence.directiveIndex];
    if (!directive) continue;
    const spanText = evidence.spans.map((span) => `"${span.text}"`).join(", ");
    entries.push({
      label: `${directive.actor.toUpperCase()} ${directive.action}`,
      detail: spanText || directive.target,
      source: evidence.provenance === "stated" ? "player" : evidence.provenance === "default" ? "default" : "inferred",
    });
  }

  if (state.manualClears > 0) {
    entries.push({
      label: "MANUAL CLEARS",
      detail: `${state.manualClears} cells cleared while Override was active`,
      source: "override",
    });
  }

  if (state.pulseClears > 0) {
    entries.push({
      label: "PULSE CLEARS",
      detail: `${state.pulseClears} cells cleared by Pulse`,
      source: "pulse",
    });
  }

  if (state.interceptClears > 0) {
    entries.push({
      label: "INSTINCT INTERCEPTS",
      detail: `${state.interceptClears} autonomous clears from compiled directives`,
      source: "inferred",
    });
  }

  if (state.trailRepairs > 0) {
    entries.push({
      label: "TRAIL REPAIRS",
      detail: `${state.trailRepairs} repairs during the round`,
      source: interpretation.plan.directives.some((directive) => directive.action === "repair") ? "player" : "default",
    });
  }

  return entries;
}

function buildCausalTrace(state: EngineState, strategy: CompiledStrategy): readonly CausalTraceEntry[] {
  if (state.attribution?.entries.length) {
    return attributionToTrace(state.attribution.entries);
  }
  return fallbackTrace(state, strategy);
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Copy command failed.");
}

export function ResultScreen({
  state,
  strategy,
  previousReceipt = null,
  onTuneSameGrid,
  onNewGrid,
  onLeave,
  multiplayer = false,
  truthLabel = "LOCAL RECEIPT · NOT SERVER SIGNED",
  statusLabel = "LOCAL / REPRODUCIBLE",
}: ResultScreenProps) {
  const receipt = createReceipt(state, strategy);
  const held = receipt.outcome === "grid-held";
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [traceOpen, setTraceOpen] = useState(false);
  const resultSoundPlayed = useRef(false);
  const deltas = previousReceipt
    ? compareReceipts(receipt, previousReceipt)
    : [];
  const causalTrace = useMemo(() => buildCausalTrace(state, strategy), [state, strategy]);
  const hasLiveAttribution = (state.attribution?.entries.length ?? 0) > 0;
  const heroStats: readonly HeroStat[] = [
    { label: "INSTINCT", value: receipt.interceptClears },
    { label: "OVERRIDE", value: receipt.manualClears },
    { label: "REPAIRS", value: receipt.trailRepairs },
    { label: "PULSE", value: receipt.pulseClears },
  ];

  useEffect(() => {
    if (resultSoundPlayed.current) return;
    resultSoundPlayed.current = true;
    gameAudio.updateAmbience(0, "result");
    gameAudio.play(held ? "round-held" : "round-lost");
    return () => {
      gameAudio.stopAmbience();
    };
  }, [held]);

  return (
    <section className={`result screen ${held ? "result--held" : "result--lost"}`} aria-labelledby="result-title">
      <div className="result__arena" aria-hidden="true">
        <PixiArena state={state} frozen />
      </div>
      <AudioToggle />
      <div className="truth-label">{truthLabel}</div>
      <div className="result__center">
        <p className="step-index">ROUND RESOLVED</p>
        <h1 id="result-title">{held ? "THE GRID HELD" : "THE CORE WENT DARK"}</h1>
        <p className="result__summary">
          {held
            ? resultSummary(
                strategy.policy.movementStyle,
                strategy.policy.formation,
                receipt.interceptClears,
                receipt.trailRepairs,
                receipt.pulseClears,
              )
            : "Corruption reached the core. The tactic failed on this grid; the player did not."}
        </p>

        <div className="performance-card" aria-label="Round performance">
          <div className="performance-card__grade">
            <span className="performance-card__grade-label">GRADE</span>
            <strong className="performance-card__grade-letter">{receipt.grade}</strong>
            <div className="performance-card__score">
              <span>{receipt.gradeScore} / 100</span>
              <div className="performance-card__score-track" aria-hidden="true">
                <span style={{ width: `${receipt.gradeScore}%` }} />
              </div>
            </div>
          </div>

          <ul className="performance-card__heroes">
            {heroStats.map((stat) => (
              <li
                key={stat.label}
                className={stat.value === 0 ? "performance-card__hero--mute" : "performance-card__hero--hot"}
              >
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </li>
            ))}
          </ul>

          <dl className="performance-card__compact">
            <div>
              <dt>CORE</dt>
              <dd>{receipt.finalHealth} / 100</dd>
            </div>
            <div>
              <dt>PEAK THREAT</dt>
              <dd>{receipt.peakThreat}</dd>
            </div>
            <div>
              <dt>FORMATION</dt>
              <dd>{strategy.policy.formation.toUpperCase()}</dd>
            </div>
          </dl>

          <p className="performance-card__next">
            <strong>NEXT</strong>
            {recommendationFor(state, strategy)}
          </p>
        </div>

        <section className="causal-trace">
          <button
            type="button"
            className="causal-trace__toggle"
            aria-expanded={traceOpen}
            onClick={() => setTraceOpen((open) => !open)}
          >
            YOUR WORDS → THIS ROUND
            <span>{traceOpen ? "−" : "+"}</span>
          </button>
          {traceOpen ? (
            <div className="causal-trace__body">
              {!hasLiveAttribution ? (
                <p className="causal-trace__note">
                  {causalTrace.length > 0
                    ? "Compiled interpretation summary — full tick-by-tick attribution will appear once the engine records it."
                    : "No causal trace recorded for this round yet."}
                </p>
              ) : null}
              {causalTrace.length > 0 ? (
                <ul className="causal-trace__list">
                  {causalTrace.map((entry, index) => (
                    <li key={`${entry.label}-${index}`} className={`causal-trace__item causal-trace__item--${sourceTone(entry.source)}`}>
                      <span>{SOURCE_LABELS[entry.source]}</span>
                      <strong>{entry.label}</strong>
                      <p>{entry.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="causal-trace__empty">Play a round with Instinct v2 to see how your sentence shaped the grid.</p>
              )}
            </div>
          ) : null}
        </section>

        {deltas.length > 0 ? (
          <section className="attempt-comparison" aria-label="Comparison with last attempt">
            <span>VS LAST ATTEMPT</span>
            <ul>
              {deltas.map((delta) => (
                <li
                  key={delta.key}
                  className={`attempt-comparison--${deltaTone(delta.value)}`}
                >
                  <small>{delta.label}</small>
                  <strong>{formatSignedDelta(delta.value)}</strong>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="result__meta">
          <span>SEED {receipt.seed}</span>
          <span>REPLAY {receipt.replayHash}</span>
          <span>{statusLabel}</span>
        </footer>

        <div className="result__actions">
          {multiplayer ? null : (
            <button className="primary-action" type="button" onClick={onTuneSameGrid}>
              TUNE SAME GRID
            </button>
          )}
          {multiplayer ? null : (
            <button className="secondary-action" type="button" onClick={onNewGrid}>
              NEW GRID
            </button>
          )}
          <button
            className="secondary-action receipt-copy"
            type="button"
            onClick={() => {
              setCopyState("idle");
              void copyText(formatReceiptShareText(receipt))
                .then(() => {
                  setCopyState("copied");
                  window.setTimeout(() => setCopyState("idle"), 1_500);
                })
                .catch(() => setCopyState("error"));
            }}
          >
            {copyState === "copied"
              ? "COPIED"
              : copyState === "error"
                ? "COPY FAILED"
                : "COPY RECEIPT"}
          </button>
          <button className={multiplayer ? "primary-action" : "secondary-action"} type="button" onClick={onLeave}>
            {multiplayer ? "LEAVE ROOM" : "LEAVE GRID"}
          </button>
        </div>
      </div>
    </section>
  );
}
