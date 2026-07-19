# Change: `instinct-runtime-v1`

Date: 2026-07-18

## Current truth to preserve

- Landing → strategy → awakening → deterministic round → receipt works locally.
- A fixed seed, compiled policy, and Pulse tick reproduce the same receipt.
- Phosphor Noir remains the accepted visual direction.
- The game truthfully labels local compilation and local receipts.
- Pulse remains the one direct, irreversible in-round player action.

## Scope in

- Replace keyword-weight theater with a bounded Instinct contract that expresses
  formation, protected radius, interceptor count, pursuit limit, movement style,
  controlled entropy, focus, risk, and Pulse threshold.
- Accept ordinary phrases such as “circle the light”, “send two”, “within 10%”,
  “do not chase”, “precisely”, and “move unpredictably”.
- Make the compiled interpretation visible in one compact confirmation state.
- Make units hold formation, intercept eligible corruption, return when pursuit
  is exhausted, and clear corruption by reaching it.
- Add seeded, low-frequency variation to target choice and formation movement.
- Extend receipts and validation with intercept clears and entropy invariants.

## Scope out

- Live OpenAI API calls, ChatGPT connection, accounts, rooms, networking, voice,
  multiplayer authority, progression, economy, and production anti-cheat.
- Free-form executable code or model-controlled numeric values.
- A separate manual builder, drawing tutorial, or preset-selection ceremony.

## Instinct contract

The compiler SHALL emit only bounded values:

- `formation`: `ring`, `spread`, `link`, or `balanced`.
- `engagementRadius`: integer cells in `[4, 14]`.
- `interceptors`: integer in `[1, 3]`.
- `pursuitLimit`: integer cells in `[0, 8]`.
- `movementStyle`: `disciplined`, `organic`, or `erratic`.
- `entropy`: integer in `[0, 100]`.
- Existing focus percentages SHALL remain integers summing to `100`.
- Existing risk and Pulse threshold bounds SHALL remain intact.

Percent radii SHALL map to grid cells with:

`radius_cells = clamp(round(percent / 100 * min(columns, rows)), 4, 14)`

This is a heuristic control mapping, not a physical-distance claim.

## Behavior contract

For every movement decision:

1. Rank corrupted cells by threat to the core, travel cost, policy focus, and a
   bounded seeded tie-break.
2. Assign at most `interceptors` lights to eligible threats inside the protected
   radius plus pursuit limit.
3. Send unassigned lights to formation anchors.
4. Apply controlled entropy only to equivalent target choices and anchor phase;
   it SHALL NOT change speed, damage, health, or action budget.
5. Clear a bounded number of corruption cells occupied by a light.

## Numeric invariants

- Positions and corruption remain inside the 30×18 grid.
- Health stays in `[0, 100]`; counters remain non-negative integers.
- Same seed + same Instinct + same Pulse tick produces the same state and receipt.
- Entropy affects path variation but never changes unit speed or direct damage.
- At most three lights are assigned to intercept; all remaining lights hold or
  recover formation.
- An engagement radius of `r` never selects a new threat farther than
  `r + pursuitLimit` cells from the core.
- Direct intercept clears delete only occupied corruption cells.

## Requirements

- `R1` The player SHALL need only one sentence and one confirmation action.
- `R2` The interpretation SHALL show formation, protected radius, response,
  pursuit, movement character, and Pulse rule in plain language.
- `R3` Unsupported prose SHALL fail safely with a useful example.
- `R4` The example circle/10% instruction SHALL compile without special syntax.
- `R5` Movement SHALL be visibly varied for organic/erratic Instincts while
  remaining exactly replayable from the recorded seed.
- `R6` Disciplined and erratic versions of one strategy SHALL preserve the same
  action bounds while producing different paths.
- `R7` Lights SHALL visibly alternate between intercepting and returning to
  formation instead of always chasing the globally cheapest corruption cell.
- `R8` Receipt semantics SHALL distinguish direct intercept clears, trail
  repairs, and Pulse clears.
- `R9` Existing responsive, reduced-motion, Pulse, and same-grid flows SHALL work.
- `R10` Runtime formulas SHALL match independent Python golden vectors.

## Scenarios

### Natural instruction becomes bounded behavior

GIVEN an empty strategy field  
WHEN the player enters “Go in circles around the light and only attack anything
within 10%; send two and do not chase”  
THEN GRIDWAKE compiles a ring, a four-cell protected radius, two interceptors,
zero pursuit, and a visible plain-language interpretation.

### Controlled entropy

GIVEN the same policy and seed  
WHEN the round is replayed  
THEN every path and receipt is identical.

GIVEN two otherwise equivalent policies  
WHEN one is disciplined and one is erratic  
THEN their paths differ while speed, health bounds, Pulse budget, and maximum
interceptor count remain identical.

### Return to formation

GIVEN a ring with zero pursuit  
WHEN no corruption remains inside its protected radius  
THEN every light targets a ring anchor rather than a distant corrupted cell.

## Proof map

| Requirement | Proof |
|---|---|
| R1–R4 | compiler tests and browser click-through |
| R5–R7 | deterministic engine tests, path assertions, live recording |
| R8 | engine/receipt tests and result-screen inspection |
| R9 | build, desktop/mobile browser screenshots, console inspection |
| R10 | Python vectors and TypeScript parity test |

## Completion boundary

This change is complete when the formula reference, regenerated golden vectors,
TypeScript parity, deterministic invariants, sensitivity sweep, build, and live
one-sentence browser path all pass. Live model interpretation remains a separate
connection layer over this validated contract.
