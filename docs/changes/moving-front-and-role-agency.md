# Change: moving-front-and-role-agency

## Current truth to preserve

- The simulation is deterministic: identical seed, strategy, arena mode, and ordered inputs produce the same state and replay hash.
- Player language compiles into bounded canonical directives; renderer behavior does not invent gameplay rules.
- Guardian, Scout, and Mender remain the three fixed roles, with Pulse and possession unchanged.
- Existing bastion rounds, campaign records, solo play, and multiplayer remain compatible.

## Scope in

- Add one campaign arena mode where the board advances horizontally through a tunnel and corruption fronts move toward the squad.
- Make agent movement intentional and role-readable through stable targets, local patrol anchors, collision-safe stepping, and role-specific fallback behavior.
- Eliminate avoidable one-cell oscillation, position swapping, and distant anchor cycling.
- Add deterministic tests for tunnel travel, replay identity, role behavior, movement stability, and bounds.

## Scope out

- No landing, menu, lobby, result-screen, typography, particle, shader, or general effects redesign.
- No new currencies, upgrades, enemies, networking protocol, or free-text grammar.
- No replacement of the Pixi renderer or React application shell.

## Requirements

1. The engine SHALL include the arena mode in its initial replay identity.
2. A tunnel arena SHALL advance corruption from right to left on a fixed deterministic cadence and SHALL generate deterministic incoming gates.
3. The tunnel SHALL expose a monotonically increasing travel distance while the round is live.
4. The Scout SHALL prefer and retain a valid intercept target instead of retargeting every movement step.
5. The Guardian SHALL preserve a defensive anchor when defensive language is active.
6. The Mender SHALL seek repairable shared trails and otherwise hold a link-support anchor.
7. Balanced and linked formations SHALL keep role identity; organic or erratic movement may vary locally but SHALL NOT rotate roles through distant anchors.
8. Autonomous movement SHALL prevent direct position swaps and SHALL avoid immediately reversing to the previous cell when another improving step exists.
9. All positions and corruption cells SHALL remain inside the 30 by 18 simulation bounds.
10. Bastion mode SHALL remain the default for solo and multiplayer rounds.

## Scenarios

### Moving front

**GIVEN** the `tunnel` arena with a fixed seed and strategy

**WHEN** the simulation advances through one tunnel-scroll cadence

**THEN** travel distance increases, surviving corruption advances left, deterministic gate cells enter from the right, and a repeated run is identical.

### Stable pursuit

**GIVEN** a Scout already moving toward a corruption target that remains valid

**WHEN** another movement decision occurs

**THEN** the Scout retains that target unless a materially more urgent rule requires reassignment.

### Collision-safe movement

**GIVEN** two lights whose preferred paths would enter each other's occupied cells

**WHEN** the movement step resolves

**THEN** they do not swap positions, overlap, or oscillate solely because of iteration order.

### Existing mode compatibility

**GIVEN** an existing call to `createInitialState` without an arena mode

**WHEN** a round starts

**THEN** it uses the original bastion spawning and pacing behavior.

## Proof mapping

- Engine tests: deterministic tunnel initialization, scrolling, spawning, bounds, and replay divergence by arena mode.
- Behavior tests: stable Scout target, fixed role anchors, no immediate A-B-A reversal, and no occupied-cell swap.
- Campaign tests: exactly one campaign level selects tunnel mode while all others remain explicit.
- Full gate: `npm run verify`.
- Runtime proof: browser playthrough of the tunnel level with screenshots and clean console output.
