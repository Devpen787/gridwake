import type { CompiledStrategy, EngineState, Formation, MovementStyle } from "./types";

function counted(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function resultSummary(
  movementStyle: MovementStyle,
  formation: Formation,
  interceptClears: number,
  trailRepairs: number,
  pulseClears: number,
): string {
  return `The ${movementStyle} ${formation} held with ${counted(interceptClears, "intercept")}, ${counted(trailRepairs, "trail repair")}, and ${counted(pulseClears, "Pulse clear")}.`;
}

export function recommendationFor(state: EngineState, strategy: CompiledStrategy): string {
  const { policy } = strategy;
  const autonomousClears = state.interceptClears + state.trailRepairs;

  if (state.health === 0) {
    return policy.formation === "ring"
      ? "Widen the protected radius or shift more focus to CORE so breaches are met earlier."
      : "Try a RING or add more CORE focus to reduce exposure around the light.";
  }
  if (state.interceptClears < 3) {
    return `Widen the ${policy.engagementRadius}-cell protected radius so interceptors meet the front earlier.`;
  }
  if (state.damageTaken > 45) {
    return policy.formation === "ring"
      ? "Shift more focus to CORE or send one fewer interceptor so another light holds the ring."
      : "Shift more focus to CORE or try a RING to keep two lights near the center.";
  }
  if (state.pulseClears > autonomousClears) {
    return "The Pulse did more work than the Instinct. Increase protected range or interceptor count.";
  }
  if (policy.formation === "link" && state.trailRepairs < 3) {
    return "Add TOGETHER, CROSSING, or REPAIR so the link formation creates more trail stitches.";
  }
  if (state.pulse.available) {
    return "The Pulse went unused. Fire it only when guidance changes to READY or FIRE.";
  }
  if (state.pulse.cleared < 3) {
    return "The Pulse fired early. Hold it for a denser pressure sector.";
  }
  if (policy.focus.edge < 25) {
    return "Add EDGE or PRESSURE to intercept more corruption before it reaches the protected zone.";
  }
  return "Tune one phrase on the same grid and compare Instinct impact, health, and peak threat.";
}
