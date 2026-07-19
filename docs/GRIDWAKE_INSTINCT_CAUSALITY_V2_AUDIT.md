# GRIDWAKE Instinct Causality v2 Audit

Date: 2026-07-19  
Formula version: `gridwake-local-v0.4`  
Change contract: `specs/instinct-causality-v2.md`

## What changed

- Default round length: 60 seconds -> 45 seconds.
- Assignment pool: protected radius plus explicit pursuit plus three staging cells.
- Assignment state: mode, target, sector, urgency, and policy reason are now
  recorded on every light and rendered directly.
- Direct intercept reach: three Manhattan cells, one clear per assigned light
  per four-tick resolution, with out-of-policy clearing prohibited.
- Pulse: unbounded sector clear plus 30-tick shield -> six closest cells plus a
  12-tick shield.
- Corruption growth: deterministic closest-front bias and two timed pressure
  escalations for earlier contact.
- Receipt: adds Instinct impact and an explained grade score.

## Formula contract

### Threat urgency

`breach_eta = max(0, distance_to_core - engagement_radius)`

`urgency = clamp(100 - 12 * breach_eta + 3 * sector_pressure, 0, 100)`

Units: grid cells, corrupted-cell count, and a dimensionless `[0, 100]` score.
Expected behavior: urgency is non-increasing with distance and non-decreasing
with sector pressure.

### Instinct impact

`autonomous = intercept_clears + trail_repairs`

`impact = round(100 * autonomous / max(1, autonomous + pulse_clears))`

Expected behavior: `[0, 100]`, non-decreasing in autonomous clears, and
non-increasing in Pulse clears for fixed autonomous clears.

### Grade score

`threat_control = 100 - peak_threat`

`score = clamp(round(0.55 * final_health + 0.25 * instinct_impact + 0.20 * threat_control), 0, 100)`

This is a transparent gameplay heuristic, not a scientific performance metric.
Health is weighted most heavily; autonomous contribution is second; peak threat
control is third. Core loss forces grade D regardless of score.

## Invariants

- Same seed, Instinct, and Pulse tick reproduce assignments, paths, counters,
  effects, receipt, and replay hash.
- Health, urgency, Instinct impact, and grade score remain in `[0, 100]`.
- Focus weights remain integer percentages summing to 100.
- At most the compiled interceptor count receives intercept assignments.
- A zero-pursuit policy cannot clear corruption outside its protected radius.
- Pulse clears at most six cells and shields for exactly 12 ticks.
- Renderer code does not decide targets, clears, scores, or receipts.

## Calibration evidence

Sensitivity sweep: four canonical strategies x 24 seeds x guided/no-Pulse = 192
deterministic rounds.

| Strategy | Guided held | Avg autonomous | Avg Pulse | Avg Instinct impact | No-Pulse held |
|---|---:|---:|---:|---:|---:|
| Ring Keeper | 24/24 | 46 | 4 | 92% | 23/24 |
| Edge Hunter | 16/24 | 47 | 4 | 86% | 11/24 |
| Chain Repair | 24/24 | 53 | 3 | 94% | 22/24 |
| Ten Percent Ring | 23/24 | 31 | 6 | 83% | 19/24 |

The canonical defensive strategies now derive most clears from autonomous
behavior. Edge Hunter remains deliberately fragile: three aggressive edge
interceptors create measurable core-exposure risk instead of becoming a
dominant policy.

## Cross-language parity

The Python reference owns policy compilation, urgency, Pulse bounds, exposure,
Instinct impact, score, and grade vectors. TypeScript tests load the generated
JSON and compare exact integer results. No floating tolerance is required
because all published outputs are integer-bounded.

## Known limits

- The threat field is a bounded heuristic, not a learned or probabilistic model.
- The 24-seed-per-mode sweep is calibration evidence, not exhaustive proof over
  all 32-bit seeds or all possible sentences.
- Local deterministic receipts do not provide server authority or anti-cheat.
- Staging predicts a breach from distance and sector pressure; it does not run a
  multi-agent Monte Carlo search.
- The prototype has no audio production pass.
- Browser smoothness still depends on the host device and is verified only on
  the tested desktop/mobile viewports.

## Verification commands

```sh
python3 validation/causal_strategy_reference.py
python3 -m py_compile validation/causal_strategy_reference.py
npm test
npm run validate:sensitivity
npm run typecheck
npm run build
```

Browser proof and screenshot paths are recorded in `output/qa/FIDELITY_LEDGER.md`.
