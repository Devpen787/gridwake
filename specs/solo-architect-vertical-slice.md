# Change: `solo-architect-vertical-slice`

Date: 2026-07-18

## Current truth to preserve

- GRIDWAKE currently exists as a complete design package, not a playable app.
- The canonical promise is: one sentence, one light, one shared grid.
- The primary visual direction is Phosphor Noir, captured in
  `design/reference/gameplay-north-star.png`.
- The existing Python sector reference proves provisional deterministic and
  bounded arithmetic but explicitly does not prove fun or production balance.
- GPT-5.6 belongs before/between rounds; live ticks remain deterministic.

## Scope in

- A locally runnable React + TypeScript + Vite app.
- Landing, solo strategy, awakening, live round, and result states.
- Three clearly labeled solo squad lights compiled from one strategy.
- A deterministic 45-second client-local engine at 10 logical ticks/second.
- PixiJS rendering with interpolation, Phosphor Noir grid, trails, corruption,
  repair stitching, central core, pulse shockwave, and minimal HUD.
- One pulse per round, available through button and Space.
- Deterministic result receipt with seed, engine version, tick count, outcome,
  final health, and replay hash.
- Reduced motion, keyboard operation, visible focus, and responsive layout.
- Engine unit/invariant tests plus browser screenshot/click-through proof.

## Scope out

- OpenAI API calls, GPT-5.6 compilation, remote MCP, OAuth, accounts, database,
  moderation service, public sharing, legal publication, deployment, and audio.
- Real-time two-player or multiplayer networking.
- Claims that this client-local slice is secure, cheat-proof, balanced, or the
  final authoritative multiplayer engine.

## Requirements

- `R1` The app SHALL present GRIDWAKE, its one-line promise, and Solo/Create/Join
  choices without a marketing-site detour.
- `R2` Solo SHALL accept a strategy of 1–240 characters or a verified template.
- `R3` Compile SHALL produce three visible bounded instincts and SHALL label the
  current compiler `LOCAL PROTOTYPE`, never GPT-5.6.
- `R4` Launch SHALL create the same initial state for the same seed and strategy.
- `R5` The engine SHALL use integer state, a seeded PRNG, canonical tick order,
  bounded pressure/health, and no model/network call in a tick.
- `R6` The live screen SHALL show only core health, timer, pulse, current
  intention, connectivity/prototype truth, and the arena.
- `R7` Pulse SHALL be accepted exactly once; subsequent button/Space attempts
  SHALL not alter game state.
- `R8` Win/loss SHALL follow core survival at the final tick or health reaching
  zero, and the result SHALL include a deterministic receipt.
- `R9` Restart SHALL produce a fresh round without reloading the document.
- `R10` The implementation SHALL preserve the accepted palette, visual economy,
  square grid, asymmetric edge corruption, distinct light shapes, and restrained
  bloom of the north-star reference.

## Scenarios

### First solo round

GIVEN a first-time visitor  
WHEN they choose Solo, enter a valid strategy, compile, confirm, and launch  
THEN the app reaches a live deterministic round with three labeled squad lights.

### Empty strategy

GIVEN the strategy screen  
WHEN the player submits empty or whitespace-only text  
THEN launch remains blocked and a concise accessible error is shown.

### Pulse budget

GIVEN a live round with pulse available  
WHEN the player activates Pulse twice  
THEN exactly the first activation changes state and the control remains spent.

### Replay identity

GIVEN two engine runs with the same seed, policy, and pulse tick  
WHEN both finish  
THEN their final state and replay hash are identical.

### Reduced motion

GIVEN `prefers-reduced-motion: reduce`  
WHEN the player enters awakening and live play  
THEN decorative travel/flash animation is suppressed while state remains legible.

## Proof map

| Requirement | Proof |
|---|---|
| R1–R3 | browser click-through and landing/program screenshots |
| R4–R5, R8 | Vitest deterministic/invariant suite |
| R6, R10 | native 1440×900 screenshot compared with north-star using `view_image` |
| R7 | unit test plus browser double-activation check |
| R9 | browser result → play again click-through |
| accessibility | keyboard path, focus, reduced-motion and mobile viewport checks |

## Completion boundary

This change is complete only when build, typecheck, tests, and the full browser
path pass and the latest implementation screenshot is directly compared with
the accepted concept. Multiplayer, GPT-5.6, and production security remain
explicitly unimplemented.

## Verification record — 2026-07-18

- `npm run typecheck`: pass.
- `npm test -- --run`: 6/6 tests pass.
- `npm run build`: pass; production bundle emitted.
- Browser: landing → compile → awakening → live 45-second round → receipt →
  play again passed.
- Browser: one Pulse activation changed the control to disabled `PULSE SPENT`;
  a second activation was unavailable.
- Browser console: zero warnings and zero errors after a fresh reload.
- Responsive proof: landing, strategy, and live arena inspected at 390×844;
  desktop proof repeated after restoring the viewport.
- Visual proof: north-star and implementation were both inspected at original
  detail; comparison is recorded in `output/qa/FIDELITY_LEDGER.md`.
