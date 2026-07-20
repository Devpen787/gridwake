import { useMemo, useState } from "react";
import {
  DEFAULT_STRATEGY,
  STRATEGY_EXAMPLES,
  compileStrategy,
} from "../game/strategy";
import type { CompiledStrategy, StrategyPolicy } from "../game/types";
import { CoreMark } from "./CoreMark";
import { StrategyPreview } from "./StrategyPreview";

type ProgramScreenProps = Readonly<{
  initialSource: string;
  onBack: () => void;
  onConfirm: (strategy: CompiledStrategy) => void;
}>;

function summaryLine(policy: StrategyPolicy): string {
  const pursuit = policy.pursuitLimit === 0 ? "NO CHASE" : `CHASE +${policy.pursuitLimit}`;
  return [
    policy.formation.toUpperCase(),
    `PROTECT ${policy.engagementRadius}`,
    `${policy.interceptors} INTERCEPTOR${policy.interceptors === 1 ? "" : "S"}`,
    pursuit,
  ].join(" · ");
}

export function ProgramScreen({ initialSource, onBack, onConfirm }: ProgramScreenProps) {
  const [source, setSource] = useState(initialSource);
  const [shouldAutoFocus] = useState(
    () => typeof window === "undefined"
      || !window.matchMedia("(pointer: coarse)").matches,
  );
  const usingDefault = source.trim().length === 0;
  const compilation = useMemo(() => {
    try {
      return { strategy: compileStrategy(usingDefault ? DEFAULT_STRATEGY : source), error: null };
    } catch (caught) {
      return {
        strategy: null,
        error: caught instanceof Error ? caught.message : "The Instinct could not be interpreted.",
      };
    }
  }, [source, usingDefault]);
  const remaining = 280 - source.length;

  return (
    <section className="program screen" aria-labelledby="program-title">
      <header className="screen-header">
        <button className="text-action" type="button" onClick={onBack}>← EXIT</button>
        <span>SOLO / ARCHITECT</span>
        <span className="truth-label truth-label--inline">LOCAL INTERPRETER</span>
      </header>

      <div className="program__content">
        <CoreMark size="small" />
        <div className="program__heading">
          <p className="step-index">01 / GIVE THE INSTINCT</p>
          <h1 id="program-title">TELL YOUR SQUAD WHAT TO DO.</h1>
          <p>One sentence. The Grid handles the rest.</p>
        </div>

        <div className="strategy-compose">
          <div className="strategy-field">
            <label htmlFor="strategy">YOUR INSTINCT</label>
            <textarea
              id="strategy"
              value={source}
              maxLength={280}
              rows={3}
              spellCheck="true"
              autoFocus={shouldAutoFocus}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Circle the light. Send two units after anything that gets close, then return without chasing."
            />
            <div className="strategy-field__meta">
              <span>{usingDefault ? "DEFAULT INSTINCT READY" : `${remaining.toString().padStart(3, "0")} REMAINING`}</span>
              {compilation.strategy ? (
                <span className="strategy-summary" aria-live="polite">{summaryLine(compilation.strategy.policy)}</span>
              ) : null}
            </div>
          </div>
          <StrategyPreview strategy={compilation.strategy} />
        </div>

        <div className="strategy-examples" aria-label="Tactic starters">
          <span>TACTIC STARTERS</span>
          {STRATEGY_EXAMPLES.map((example) => {
            const active = source.trim() === example.source;
            return (
              <button
                key={example.label}
                type="button"
                aria-pressed={active}
                onClick={() => setSource(example.source)}
              >
                {example.label}
              </button>
            );
          })}
        </div>

        {compilation.error ? <p className="form-error" role="alert">{compilation.error}</p> : null}
      </div>

      <footer className="program__actions program__actions--single">
        <button
          className="primary-action"
          type="button"
          disabled={!compilation.strategy}
          onClick={() => compilation.strategy && onConfirm(compilation.strategy)}
        >
          WAKE →
        </button>
      </footer>
    </section>
  );
}
