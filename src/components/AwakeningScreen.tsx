import { useCallback, useEffect, useMemo } from "react";
import type { CanonicalDirective } from "../game/instinct/types";
import type { CompiledStrategy, LightRole } from "../game/types";
import { CoreMark } from "./CoreMark";

type AwakeningScreenProps = Readonly<{
  strategy: CompiledStrategy;
  onComplete: () => void;
}>;

const AWAKENING_MS = 1_600;

function directiveMatchesRole(directive: CanonicalDirective, role: LightRole): boolean {
  if (directive.actor === role) return true;
  if (directive.actor !== "squad") return false;
  if (role === "scout") return directive.action === "intercept";
  if (role === "mender") return directive.action === "repair" || directive.target === "shared-trail";
  return directive.action === "hold"
    || directive.action === "orbit"
    || directive.action === "screen"
    || directive.action === "regroup";
}

function roleFragmentText(strategy: CompiledStrategy, role: LightRole): string {
  const interpretation = strategy.interpretation;
  const instinct = strategy.instincts.find((entry) => entry.role === role);
  if (!interpretation) return instinct?.label ?? role.toUpperCase();

  const unresolved = new Set(
    interpretation.unresolved.map((span) => span.text.trim().toLowerCase()),
  );

  for (const evidence of interpretation.evidenceByDirective) {
    const directive = interpretation.plan.directives[evidence.directiveIndex];
    if (!directive || !directiveMatchesRole(directive, role)) continue;
    const span = evidence.spans.find(
      (entry) => !unresolved.has(entry.text.trim().toLowerCase()),
    );
    if (span) return span.text.toUpperCase();
  }

  const directive = interpretation.plan.directives.find(
    (entry) => directiveMatchesRole(entry, role),
  );
  if (directive) {
    return `${directive.action.replace(/-/g, " ")} ${directive.target.replace(/-/g, " ")}`.toUpperCase();
  }

  return instinct?.label ?? role.toUpperCase();
}

export function AwakeningScreen({ strategy, onComplete }: AwakeningScreenProps) {
  const fragments = useMemo(
    () => (["guardian", "scout", "mender"] as const).map((role, index) => ({
      role,
      text: roleFragmentText(strategy, role),
      className: `orbit-fragment orbit-fragment--${index + 1}`,
    })),
    [strategy],
  );

  const skip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timeout = window.setTimeout(onComplete, AWAKENING_MS);
    return () => window.clearTimeout(timeout);
  }, [onComplete]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        skip();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [skip]);

  return (
    <section
      className="awakening screen awakening--crossfade"
      aria-label="Loading the compiled instincts into the lights"
      onClick={skip}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") skip();
      }}
      role="button"
      tabIndex={0}
    >
      <p className="step-index">INSTINCT COMMIT</p>
      <div className="awakening__orbit" aria-hidden="true">
        {fragments.map((fragment) => (
          <span className={fragment.className} key={fragment.role}>
            {fragment.text}
          </span>
        ))}
        <CoreMark size="large" />
      </div>
      <p className="awakening__status" role="status">
        {strategy.policy.movementStyle.toUpperCase()} {strategy.policy.formation.toUpperCase()} · PROTECT {strategy.policy.engagementRadius} · {strategy.policy.interceptors} INTERCEPTOR{strategy.policy.interceptors === 1 ? "" : "S"} · {strategy.policy.pursuitLimit === 0 ? "NO CHASE" : `CHASE +${strategy.policy.pursuitLimit}`} · SEED LOCKED
      </p>
      <p className="awakening__skip">CLICK OR PRESS SPACE TO SKIP</p>
    </section>
  );
}
