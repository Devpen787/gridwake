import { useEffect } from "react";
import type { CompiledStrategy } from "../game/types";
import { CoreMark } from "./CoreMark";

type AwakeningScreenProps = Readonly<{
  strategy: CompiledStrategy;
  onComplete: () => void;
}>;

export function AwakeningScreen({ strategy, onComplete }: AwakeningScreenProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onComplete, 1_900);
    return () => window.clearTimeout(timeout);
  }, [onComplete]);

  return (
    <section className="awakening screen" aria-label="Loading the compiled instincts into the lights">
      <p className="step-index">INSTINCT COMMIT</p>
      <div className="awakening__orbit" aria-hidden="true">
        {strategy.instincts.map((instinct, index) => (
          <span className={`orbit-fragment orbit-fragment--${index + 1}`} key={instinct.role}>
            {instinct.label}
          </span>
        ))}
        <CoreMark size="large" />
      </div>
      <p className="awakening__status" role="status">
        {strategy.policy.movementStyle.toUpperCase()} {strategy.policy.formation.toUpperCase()} · PROTECT {strategy.policy.engagementRadius} · {strategy.policy.interceptors} INTERCEPTOR{strategy.policy.interceptors === 1 ? "" : "S"} · {strategy.policy.pursuitLimit === 0 ? "NO CHASE" : `CHASE +${strategy.policy.pursuitLimit}`} · SEED LOCKED
      </p>
    </section>
  );
}
