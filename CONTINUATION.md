# GRIDWAKE crash-resume contract

This file is the first read after any interruption, credit cutoff, app restart, or
context compaction. It is operational, not promotional.

## Role

You are the sole engineer-designer on GRIDWAKE, a 45-second deterministic strategy game
where one natural-language sentence commands a three-light squad. You optimise for a
truthful, playable, beautiful demo — never for the appearance of progress.

## Ground truth protocol

1. Before any work: read this file, then the active spec in `specs/`. Files are the only
   memory that survives; never trust recalled state.
2. After any work: update this file with the exact result, the exact failure (if any),
   and the next executable action. Update doc claims (test counts, capabilities) in the
   same commit that changes them.

## Prime directive: one gate at a time

Work only on the lowest incomplete gate. Never start a gate while the one below it is
unverified. Never add a new mechanic, screen, or dependency that no current gate requires.

## Current verified truth

- Active implementation branch: **`instinct-runtime-v2`** from baseline
  `ab99c0ab332c9eaa032eb866fa4fe53656840727` (do not modify `main` /
  `demo-final-polish` directly on this slice; no merge/deploy until requested).
- Compiler label: **`local-instinct-v2`**. Engine version: **`gridwake-local-v0.6`**.
- Spec: `specs/instinct-runtime-v2.md`. Inventory: `docs/instinct-runtime-v2-inventory.md`.
- Pipeline: `src/game/instinct/*` → canonical plan + interpretation →
  `policyAdapter` → legacy `StrategyPolicy` for engine compatibility.
- Program screen is a strategy laboratory (preview, role interpretation, warnings,
  EXAMPLE STRATEGIES). WAKE blocks on contradictions / no actionable directive.
- Result screen: expandable **YOUR WORDS → THIS ROUND** attribution (player /
  inferred / default / override / pulse).
- Multiplayer: `compileRoleScoped` + ownership merge in `squadStrategy.ts`.
- **204** TypeScript tests pass; Python golden contract
  `gridwake-instinct-runtime-v2`; sensitivity + `npm run verify` PASS.
- Intentional golden deltas vs v1: focus from directive weights; matchedSignals are
  directive tokens; aggressive default leash 6; organic entropy 42; “tight” no longer
  lowers risk.

## Active slice

Instinct Runtime v2 vertical slice is **implemented, verified, and ready to commit**
on `instinct-runtime-v2`.

## Next executable actions

- [x] Branch from `ab99c0a`; inventory; write `specs/instinct-runtime-v2.md`.
- [x] Implement instinct compiler modules + strategy facade.
- [x] Engine condition evaluation + attribution + plan-aware targeting.
- [x] Program / StrategyPreview / Result upgrades.
- [x] Multiplayer role-scoped compile.
- [x] ≥100 corpus + metamorphic + Edge-Hunter causal tests.
- [x] Python golden v2 + `npm run verify` (204 TS tests).
- [x] Browser: strategy lab (`LOCAL-INSTINCT-V2`), contradiction WAKE-disabled,
      Edge Hunter interpretation (spread / R14 / erratic / highest-pressure / 3 /
      leash 6). Screenshots in `docs/instinct-runtime-v2/`.
- [x] Commit on `instinct-runtime-v2` only (no merge, no deploy):
      `c501c33080ee9bee500f1f6ea64ae540c38ea8a7`.

## Stop conditions

Stop only for an externally controlled condition: credits or execution environment
unavailable; a paid/account action requiring approval; deployment ownership or policy
facts only the user can supply; or the same blocker failing three distinct approaches.
At any stop, write the exact failure and next safe action here first.
