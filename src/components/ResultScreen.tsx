import { createReceipt } from "../game/engine";
import { recommendationFor, resultSummary } from "../game/analysis";
import type { CompiledStrategy, EngineState } from "../game/types";
import { CoreMark } from "./CoreMark";

type ResultScreenProps = Readonly<{
  state: EngineState;
  strategy: CompiledStrategy;
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

export function ResultScreen({
  state,
  strategy,
  onTuneSameGrid,
  onNewGrid,
  onLeave,
  multiplayer = false,
  truthLabel = "LOCAL RECEIPT · NOT SERVER SIGNED",
  statusLabel = "LOCAL / REPRODUCIBLE",
}: ResultScreenProps) {
  const receipt = createReceipt(state, strategy);
  const held = receipt.outcome === "grid-held";
  const heroStats: readonly HeroStat[] = [
    { label: "INTERCEPTS", value: receipt.interceptClears },
    { label: "REPAIRS", value: receipt.trailRepairs },
    { label: "PULSE", value: receipt.pulseClears },
  ];

  return (
    <section className={`result screen ${held ? "result--held" : "result--lost"}`} aria-labelledby="result-title">
      <div className="truth-label">{truthLabel}</div>
      <div className="result__center">
        <CoreMark size="large" active={held} />
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
          <button className={multiplayer ? "primary-action" : "secondary-action"} type="button" onClick={onLeave}>
            {multiplayer ? "LEAVE ROOM" : "LEAVE GRID"}
          </button>
        </div>
      </div>
    </section>
  );
}
