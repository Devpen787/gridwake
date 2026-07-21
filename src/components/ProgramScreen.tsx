import { useMemo, useState } from "react";
import {
  DEFAULT_STRATEGY,
  STRATEGY_EXAMPLES,
  compileStrategyWithReading,
} from "../game/strategy";
import { explainInterpretation } from "../game/instinct";
import type { CampaignLevel } from "../game/campaign";
import type { CompiledStrategy } from "../game/types";
import type { DirectiveEvidence, InterpretationWarning, SourceSpan, StrategyInterpretation } from "../game/instinct/types";
import { CoreMark } from "./CoreMark";
import { StrategyPreview, type StrategyPreviewHighlight } from "./StrategyPreview";

type ProgramScreenProps = Readonly<{
  initialSource: string;
  level?: CampaignLevel | null;
  onBack: () => void;
  onConfirm: (strategy: CompiledStrategy) => void;
}>;

function spanText(spans: readonly SourceSpan[]): string {
  return spans.map((span) => `"${span.text}"`).join(", ");
}

function WarningList({ warnings }: Readonly<{ warnings: readonly InterpretationWarning[] }>) {
  if (warnings.length === 0) return null;
  return (
    <ul className="strategy-lab__warnings">
      {warnings.map((warning, index) => (
        <li
          key={`${warning.kind}-${index}`}
          className={warning.blocking ? "strategy-lab__warning--blocking" : "strategy-lab__warning"}
        >
          <span>{warning.blocking ? "BLOCKING" : warning.kind.toUpperCase()}</span>
          <strong>{warning.message}</strong>
          {warning.evidence.length > 0 ? <em>{spanText(warning.evidence)}</em> : null}
        </li>
      ))}
    </ul>
  );
}

function ReadingDetails({
  interpretation,
  highlight,
  onHighlight,
}: Readonly<{
  interpretation: StrategyInterpretation;
  highlight: StrategyPreviewHighlight;
  onHighlight: (next: StrategyPreviewHighlight) => void;
}>) {
  const softWarnings = interpretation.warnings.filter((warning) => !warning.blocking);
  return (
    <div className="strategy-lab__reading">
      {interpretation.evidenceByDirective.length > 0 ? (
        <div className="strategy-lab__evidence">
          <span>EVIDENCE</span>
          <ul>
            {interpretation.evidenceByDirective.map((entry: DirectiveEvidence) => (
              <li
                key={entry.directiveIndex}
                onMouseEnter={() => onHighlight({ kind: "directive", index: entry.directiveIndex })}
                onMouseLeave={() => onHighlight(null)}
                onFocus={() => onHighlight({ kind: "directive", index: entry.directiveIndex })}
                onBlur={() => onHighlight(null)}
                tabIndex={0}
                className={
                  highlight?.kind === "directive" && highlight.index === entry.directiveIndex
                    ? "strategy-lab__evidence-item--highlight"
                    : ""
                }
              >
                <small>D{entry.directiveIndex + 1} · {entry.provenance.toUpperCase()}</small>
                <strong>{spanText(entry.spans) || "compiler inference"}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {interpretation.defaultsUsed.length > 0 ? (
        <div className="strategy-lab__defaults">
          <span>DEFAULTS</span>
          <p>{interpretation.defaultsUsed.join(" · ")}</p>
        </div>
      ) : null}

      {interpretation.unresolved.length > 0 ? (
        <div className="strategy-lab__unresolved">
          <span>UNRESOLVED</span>
          <p>{spanText(interpretation.unresolved)}</p>
        </div>
      ) : null}

      <WarningList warnings={softWarnings} />
    </div>
  );
}

function InterpretationPanel({
  interpretation,
  explained,
  highlight,
  onHighlight,
}: Readonly<{
  interpretation: StrategyInterpretation;
  explained: ReturnType<typeof explainInterpretation>;
  highlight: StrategyPreviewHighlight;
  onHighlight: (next: StrategyPreviewHighlight) => void;
}>) {
  const [readingOpen, setReadingOpen] = useState(false);
  const roles = [
    { key: "guardian", label: "GUARDIAN", text: explained.guardian, tone: "guardian" },
    { key: "scout", label: "SCOUT", text: explained.scout, tone: "scout" },
    { key: "mender", label: "MENDER", text: explained.mender, tone: "mender" },
  ] as const;
  const blockingWarnings = interpretation.warnings.filter((warning) => warning.blocking);
  const detailCount = interpretation.evidenceByDirective.length
    + interpretation.defaultsUsed.length
    + interpretation.unresolved.length
    + interpretation.warnings.filter((warning) => !warning.blocking).length;

  return (
    <section className="strategy-lab__interpretation" aria-label="Strategy interpretation">
      <header className="strategy-lab__interpretation-header">
        <span>YOUR SQUAD WILL</span>
        <strong>{Math.round(interpretation.confidence * 100)}% CONFIDENCE</strong>
      </header>

      <div className="strategy-lab__formation">
        <span>FORMATION</span>
        <strong>{explained.formation}</strong>
      </div>

      <div className="strategy-lab__roles">
        {roles.map((role) => (
          <article
            key={role.key}
            className={[
              `strategy-lab__role strategy-lab__role--${role.tone}`,
              highlight?.kind === "role" && highlight.role === role.key ? "strategy-lab__role--highlight" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onMouseEnter={() => onHighlight({ kind: "role", role: role.key })}
            onMouseLeave={() => onHighlight(null)}
            onFocus={() => onHighlight({ kind: "role", role: role.key })}
            onBlur={() => onHighlight(null)}
            tabIndex={0}
          >
            <span>{role.label}</span>
            <p>{role.text}</p>
          </article>
        ))}
      </div>

      <div className="strategy-lab__pulse">
        <span>PULSE</span>
        <strong>{explained.pulse}</strong>
      </div>

      <WarningList warnings={blockingWarnings} />

      {detailCount > 0 ? (
        <div className="strategy-lab__reading-block">
          <button
            type="button"
            className="strategy-lab__reading-toggle"
            aria-expanded={readingOpen}
            onClick={() => setReadingOpen((open) => !open)}
          >
            HOW IT READ YOUR WORDS
            <span>{readingOpen ? "−" : "+"}</span>
          </button>
          {readingOpen ? (
            <ReadingDetails
              interpretation={interpretation}
              highlight={highlight}
              onHighlight={onHighlight}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ProgramScreen({ initialSource, level = null, onBack, onConfirm }: ProgramScreenProps) {
  const [source, setSource] = useState(initialSource);
  const [highlight, setHighlight] = useState<StrategyPreviewHighlight>(null);
  const [shouldAutoFocus] = useState(
    () => typeof window === "undefined"
      || !window.matchMedia("(pointer: coarse)").matches,
  );
  const usingDefault = source.trim().length === 0;
  const effectiveSource = usingDefault ? DEFAULT_STRATEGY : source;

  const compilation = useMemo(
    () => compileStrategyWithReading(effectiveSource),
    [effectiveSource],
  );

  const explained = useMemo(
    () => explainInterpretation(compilation.interpretation),
    [compilation.interpretation],
  );

  const wakeBlocked = compilation.interpretation.blocking
    || compilation.interpretation.plan.directives.length === 0;
  const wakeEnabled = !wakeBlocked && compilation.strategy !== null;
  const wakeHint = wakeBlocked
    ? compilation.error ?? "Resolve contradictions before waking the squad."
    : compilation.interpretation.defaultsUsed.length > 0
      ? "Defaults applied — review before waking."
      : "Instinct ready.";

  const remaining = 280 - source.length;

  return (
    <section className="program screen" aria-labelledby="program-title">
      <header className="screen-header">
        <button className="text-action" type="button" onClick={onBack}>← EXIT</button>
        <span>SOLO / ARCHITECT</span>
        <span className="truth-label truth-label--inline">LOCAL-INSTINCT-V2</span>
      </header>

      <div className="program__content program__content--lab">
        <CoreMark size="small" />
        <div className="program__heading">
          <p className="step-index">01 / STRATEGY LABORATORY</p>
          <h1 id="program-title">{level ? level.name : "WORDSMITH YOUR INSTINCT."}</h1>
          <p>
            {level
              ? level.brief
              : "One sentence. GRIDWAKE shows what it understood before you wake the squad."}
          </p>
        </div>

        {level ? (
          <div className="level-briefing" role="note">
            <span className="level-briefing__tag">
              GRID {String(level.index + 1).padStart(2, "0")} · {level.seconds}S · PAR {level.parScore}
            </span>
            <p>{level.hint}</p>
          </div>
        ) : null}

        <div className="strategy-lab">
          <div className="strategy-lab__workspace">
            <div className="strategy-field">
              <label htmlFor="strategy">YOUR SENTENCE</label>
              <textarea
                id="strategy"
                value={source}
                maxLength={280}
                rows={4}
                spellCheck="true"
                autoFocus={shouldAutoFocus}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Command the squad — or each light by name: Guardian holds the core. Scout hunts the densest sector. Mender repairs shared trails. Pulse below 45%."
              />
              <p className="strategy-field__tip">
                Address lights individually — <em>Guardian…</em>, <em>Scout…</em>, <em>Mender…</em> — or the whole squad at once.
                Your sentence also aims the Pulse.
              </p>
              <div className="strategy-field__meta">
                <span>{usingDefault ? "DEFAULT INSTINCT LOADED" : `${remaining.toString().padStart(3, "0")} REMAINING`}</span>
                <span className="strategy-summary" aria-live="polite">{explained.formation}</span>
              </div>
            </div>

            <div className="strategy-examples" aria-label="Example strategies">
              <span>EXAMPLE STRATEGIES</span>
              {STRATEGY_EXAMPLES.map((example) => {
                const active = source.trim() === example.source;
                return (
                  <button
                    key={example.label}
                    type="button"
                    className={`strategy-example strategy-example--${example.tier}`}
                    aria-pressed={active}
                    onClick={() => setSource(example.source)}
                    onMouseEnter={() => setHighlight({ kind: "formation" })}
                    onMouseLeave={() => setHighlight(null)}
                    onFocus={() => setHighlight({ kind: "formation" })}
                    onBlur={() => setHighlight(null)}
                  >
                    <i className={`strategy-example__tier strategy-example__tier--${example.tier}`} aria-hidden="true" />
                    {example.label}
                  </button>
                );
              })}
              <span className="strategy-examples__legend" aria-hidden="true">
                <em className="strategy-example__tier strategy-example__tier--starter" /> STARTER
                <em className="strategy-example__tier strategy-example__tier--advanced" /> ADVANCED
                <em className="strategy-example__tier strategy-example__tier--expert" /> EXPERT
              </span>
            </div>

            <div className="strategy-lab__wake">
              <p className={`strategy-lab__wake-hint${wakeBlocked ? " strategy-lab__wake-hint--blocked" : ""}`}>
                {wakeHint}
              </p>
              <button
                className="primary-action"
                type="button"
                disabled={!wakeEnabled}
                onClick={() => compilation.strategy && onConfirm(compilation.strategy)}
              >
                WAKE →
              </button>
            </div>
          </div>

          <div className="strategy-lab__preview-pane">
            <StrategyPreview
              strategy={compilation.strategy}
              interpretation={compilation.interpretation}
              highlight={highlight}
            />
          </div>

          <InterpretationPanel
            interpretation={compilation.interpretation}
            explained={explained}
            highlight={highlight}
            onHighlight={setHighlight}
          />
        </div>

        {compilation.error && wakeBlocked ? (
          <p className="form-error" role="alert">{compilation.error}</p>
        ) : null}
      </div>
    </section>
  );
}
