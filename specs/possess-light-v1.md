# Possess Light v1 — solo manual override

## Current truth

Solo players can possess one light at a time. Instinct remains the primary controller;
possession is a scarce six-second intervention (`OVERRIDE_MAX_TICKS = 60` at 10 Hz).

- `1` / `2` / `3` select a light; `Esc` releases early and preserves remaining budget.
- While possessed, that light ignores Instinct assignment. WASD / arrows queue one
  orthogonal step per move tick (same budget as autopilot: even ticks, one cell,
  no stacking). With no input it holds.
- A possessed light clears **only the corruption cell it occupies**, on every logical
  tick. Adjacent cells are not cleared. Manual clears increment `manualClears` and
  never `interceptClears`.
- Override energy is total across the round; switching lights does not reset it.
  At zero, possession auto-releases and further possession is blocked.
- Autopilot interceptors still clear one cell every 0.4s inside the Instinct engagement
  bubble around the core (`interceptClears` only).
- Quiet UI: bottom roster maps `1`/`2`/`3` to colour + role; engaged state shows
  `MANUAL OVERRIDE · WASD STEP · ESC RELEASE` plus a small OVERRIDE energy meter.
- Multiplayer: disabled (`allowPossess={roomState === null}`); no host-ordered move channel.

## Clear attribution

```ts
type ClearResolution = Readonly<{
  corruption: Set<string>;
  autonomousPoints: readonly Point[];
  manualPoints: readonly Point[];
}>;
```

`instinctImpact` numerator = autonomous intercept clears + trail repairs.
Denominator may include autonomous + manual + Pulse clears. Manual clears never
enter the autonomous numerator.

## Round phases (render + HUD only; growth thresholds unchanged)

| Phase | Ticks | Growth |
|-------|-------|--------|
| probe | 0–149 | 1 cell / tick |
| surge | 150–329 | 2 cells / tick |
| collapse | 330–end | 3 cells / tick |

## Proof

- Unit tests: occupy-only clear, manual vs intercept attribution, 60-tick budget,
  early release preserves budget, auto-release at zero, phase boundaries,
  identical possession sequences → identical replay hash.
- Typecheck + full suite via `npm run verify`.
- Browser: possess, spend / release / re-possess, Instinct-only, same-seed rematch,
  Pulse across SURGE, mobile + reduced motion, multiplayer cannot possess.
