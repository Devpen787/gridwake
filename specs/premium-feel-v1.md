# Premium Feel v1 — Gate 6 presentation slice

## Current truth

Arena uses layered Pixi `Graphics` (atmosphere, grid, trails, crust-ish corruption,
soft core bloom, pulse rings, impacts). HUD is quiet: health / timer / intention /
pulse. Result screen is a grade strip plus a full receipt grid (spreadsheet-first).
No new npm dependencies. Engine stays pure; rendering does not mutate state.

## Delta

Close the north-star gap with juice only — no new mechanics, no Gate 3 sector pick,
no dial/dashboard chrome, no audio pack.

### Arena (render-only)

- Stronger boundary crust: jagged outer cells, brighter edge alpha, quieter mid-field.
- Pulse grid displacement: during pulse age window, nudge nearby grid vertices outward
  (fake warp; no shader / no new dependency).
- Larger intercept/damage bursts; brief cell flash on hit/clear.
- Core health tension: glow tightens and danger tint rises as health drops.
- Possess claim flash when `possessedLightId` changes; brighter possession ring.
- Thicker right-angle trail joints.

### HUD

- Segmented health bar with colour shift by band.
- Pulse hold/fire kick (CSS) + READY/FIRE emphasis.
- Possess cue: `POSSESS · N · ROLE` + Esc line; shake on damage/pulse (reduced-motion off).

### Result card

- Grade-first: large grade + score bar, three hero stats, compact CORE/PEAK,
  secondary NEXT tip, quiet SEED/REPLAY/STATUS footer.
- Short enter animation; reduced-motion collapses to static.

## Non-goals

- Gate 3 pulse sector agency, words→round dials, audio, engine rule changes,
  Pixi filter packages unless layered Graphics fails (not used in this slice).

## Proof

- Typecheck + full suite + production build.
- Browser: solo round → grade-first result; possess 1/2/3; fire pulse; damage tint/shake.
- Reduced-motion: no shake / no grade slide.
