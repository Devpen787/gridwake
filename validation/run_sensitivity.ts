import { writeFileSync } from "node:fs";
import { activatePulse, advanceTick, createInitialState, createReceipt, pulseGuidance, threatLevel } from "../src/game/engine";
import { STRATEGY_EXAMPLES, compileStrategy } from "../src/game/strategy";

const strategies = STRATEGY_EXAMPLES.map((example) => ({
  label: example.label,
  strategy: compileStrategy(example.source),
}));

const report = strategies.map(({ label, strategy }) => {
  const runMode = (mode: "guided-pulse" | "no-pulse") => Array.from({ length: 24 }, (_, index) => {
    let state = createInitialState(0x9e3779b9 + (index + 1) * 7_919, strategy);
    while (!state.ended) {
      const guidance = pulseGuidance(state.health, threatLevel(state.corruption), strategy.policy.pulseHealthThreshold);
      if (mode === "guided-pulse" && state.pulse.available && guidance === "FIRE") state = activatePulse(state);
      state = advanceTick(state);
    }
    const receipt = createReceipt(state, strategy);
    return {
      seed: state.seed,
      held: state.sharedWin,
      health: state.health,
      repairs: state.trailRepairs,
      intercepts: state.interceptClears,
      finalCorruption: state.corruption.size,
      pulseClears: state.pulseClears,
      peakThreat: state.peakThreat,
      damage: state.damageTaken,
      instinctImpact: receipt.instinctImpact,
      gradeScore: receipt.gradeScore,
      grade: receipt.grade,
      replay: state.replayHash,
    };
  });
  const summarize = (rounds: ReturnType<typeof runMode>) => ({
    held: rounds.filter((round) => round.held).length,
    lost: rounds.filter((round) => !round.held).length,
    minHealth: Math.min(...rounds.map((round) => round.health)),
    maxHealth: Math.max(...rounds.map((round) => round.health)),
    averageHealth: Math.round(rounds.reduce((sum, round) => sum + round.health, 0) / rounds.length),
    averageRepairs: Math.round(rounds.reduce((sum, round) => sum + round.repairs, 0) / rounds.length),
    averageIntercepts: Math.round(rounds.reduce((sum, round) => sum + round.intercepts, 0) / rounds.length),
    averageFinalCorruption: Math.round(rounds.reduce((sum, round) => sum + round.finalCorruption, 0) / rounds.length),
    averagePulseClears: Math.round(rounds.reduce((sum, round) => sum + round.pulseClears, 0) / rounds.length),
    averageAutonomousClears: Math.round(rounds.reduce((sum, round) => sum + round.intercepts + round.repairs, 0) / rounds.length),
    averageInstinctImpact: Math.round(rounds.reduce((sum, round) => sum + round.instinctImpact, 0) / rounds.length),
    averageGradeScore: Math.round(rounds.reduce((sum, round) => sum + round.gradeScore, 0) / rounds.length),
    maxPeakThreat: Math.max(...rounds.map((round) => round.peakThreat)),
    rounds,
  });
  return {
    label,
    policy: strategy.policy,
    guidedPulse: summarize(runMode("guided-pulse")),
    noPulse: summarize(runMode("no-pulse")),
  };
});

const artifact = {
  contract: "gridwake-instinct-causality-v2",
  generatedBy: "validation/run_sensitivity.ts",
  strategyCount: report.length,
  seedsPerMode: 24,
  strategies: report,
};
writeFileSync(new URL("./causal_sensitivity_report.json", import.meta.url), `${JSON.stringify(artifact, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  output: "validation/causal_sensitivity_report.json",
  strategies: report.map((strategy) => ({
    label: strategy.label,
    guidedPulse: { ...strategy.guidedPulse, rounds: undefined },
    noPulse: { ...strategy.noPulse, rounds: undefined },
  })),
}, null, 2)}\n`);
