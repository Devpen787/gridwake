# Possess Light v1 — solo manual override

## Current truth

Lights are fully autopilot: each even tick `assignLights` picks formation or intercept
targets from the Instinct policy; `stepToward` moves one cell; intercept clears and
trail repairs run on schedule. The only mid-round player verb is Pulse.

## Delta

Solo players can possess one light at a time:

- `1` / `2` / `3` select a light; `Esc` releases.
- While possessed, that light ignores Instinct assignment. WASD / arrows queue one
  orthogonal step per move tick (same budget as autopilot: even ticks, one cell,
  no stacking). With no input it holds.
- Possessed lights still clear corruption under the same proximity rules as
  interceptors (so driving into a breach does work).
- Other lights stay on Instinct.
- Replay hash records possession changes and applied manual steps.
- Quiet UI: stronger glow on the possessed light + one line
  `MANUAL · WASD · ESC`. No new dashboard.
- Multiplayer: disabled in this slice (no host-ordered move channel yet).

## Proof

- Unit tests: possess, hold without input, apply step, release back to autopilot,
  identical manual sequences → identical replay hash, different sequences diverge.
- Typecheck + full suite.
- Browser: select light 1, move with WASD, Esc releases, Pulse still works.
