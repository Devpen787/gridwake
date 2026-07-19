# Change: `instinct-causality-v2`

Date: 2026-07-19

## Player fantasy and primary verbs

The player is a wordsmith commanding three autonomous lights. Their sentence
defines the squad's formation, protected zone, response budget, pursuit limit,
movement character, and emergency threshold. During the round the player reads
the squad's decisions, then makes one irreversible timing decision: Pulse. After
the round the player tunes one phrase against the same deterministic grid.

Primary verbs: `WRITE -> READ -> WAKE -> WATCH/UNDERSTAND -> PULSE -> TUNE`.

Target session: one 45-second round plus a fast same-grid retry.

## Current truth to preserve

- React owns screens and text-heavy UI; Pixi owns the arena rendering.
- The simulation remains renderer-independent and deterministic.
- One sentence compiles locally into bounded policy values without a live LLM.
- Same seed + same Instinct + same Pulse tick reproduces the same receipt.
- The player has one direct in-round action and it remains irreversible.
- Local compilation and receipts remain truthfully labeled.
- Same-grid tuning preserves the sentence and seed.
- Phosphor Noir remains the visual direction.

## Scope in

- Make the compiled sentence visibly causal during live play.
- Add explicit assignment targets, modes, reasons, urgency, and protected-zone
  telegraphing to the serializable simulation state.
- Improve autonomous interception so a defensive Instinct does measurable work
  before Pulse while preserving its radius and pursuit constraints.
- Rebalance Pulse into a bounded tactical rescue instead of the main clear source.
- Shorten and pace the round for earlier contact and a faster retry loop.
- Add intercept impact effects, target lines, formation anchors, protected and
  pursuit boundaries, and escalating danger feedback.
- Make grades, Instinct contribution, recommendations, grammar, and character
  counts truthful and understandable.
- Expand deterministic, parity, stress, and browser proof.

## Scope out

- Live OpenAI/model calls, accounts, Codex/ChatGPT login, networking,
  multiplayer authority, progression, economy, audio asset production, and
  production anti-cheat.
- Engine migration from React + Pixi to Phaser.
- Free-form executable commands or model-selected unbounded numeric values.
- New direct combat controls beyond the single Pulse action.

## Architecture contract

- Simulation SHALL own targets, decisions, counters, effects, score inputs, and
  replay state. Pixi SHALL only render the supplied state.
- DOM SHALL own the strategy field, live interpretation, HUD, controls, result,
  and accessible text.
- New runtime fields SHALL remain serializable and renderer-agnostic.
- Input mapping SHALL keep pointer activation and `Space` equivalent for Pulse.

## Behavioral contract

### Predictive threat field

For each corrupted cell `p`:

- `d_core = Manhattan(p, core)`
- `breach_eta = max(0, d_core - engagementRadius)`
- `urgency = clamp(100 - 12 * breach_eta + 3 * sectorPressure, 0, 100)`

The value is a bounded tactical heuristic, not a probabilistic forecast.

The assignment pool SHALL include cells inside:

`engagementRadius + pursuitLimit + LOOKAHEAD_CELLS`

where `LOOKAHEAD_CELLS = 3`. A zero-pursuit unit may stage at the protected
boundary for an approaching threat but SHALL NOT clear a cell outside the
protected radius.

### Squad assignment auction

Each available light bids on each candidate with a deterministic cost:

`bid = travelCost + policyBias + roleBias - urgencyBonus + seededTieBreak`

The lowest bid wins. At most `interceptors` lights receive intercept
assignments. Unassigned lights receive formation assignments. Every assignment
stores a target, mode, urgency, sector, and plain-language reason.

### Interception

- Lights move at the existing fixed action rate.
- A light SHALL clear at most one corrupted cell per intercept resolution.
- A zero-pursuit policy SHALL clear only cells with
  `distanceToCore <= engagementRadius`.
- An intercept may clear a cell within three Manhattan cells of the assigned
  light, representing its projected weapon reach.
- Direct clears SHALL create bounded, short-lived impact records in state.

### Pulse

- Pulse SHALL target the highest-pressure sector.
- Pulse SHALL clear at most `PULSE_CLEAR_CAP = 6` cells, ranked closest to core.
- Pulse SHALL shield the core for `PULSE_SHIELD_TICKS = 12` (1.2 seconds).
- Pulse SHALL never replenish or fire twice.
- Across the canonical defensive strategies, average autonomous clears SHOULD
  exceed average Pulse clears in guided-Pulse sensitivity runs.

### Pacing

- Default round length SHALL be 45 seconds.
- Corruption growth SHALL deterministically favor the closest active front often
  enough to create early readable contact while retaining seeded variation.
- Threat, movement speed, damage, and action budgets SHALL remain bounded.

## Result contract

`autonomousClears = interceptClears + trailRepairs`

`instinctImpact = round(100 * autonomousClears / max(1, autonomousClears + pulseClears))`

`threatControl = 100 - peakThreat`

`gradeScore = clamp(round(0.55 * finalHealth + 0.25 * instinctImpact + 0.20 * threatControl), 0, 100)`

If the core is lost, the grade is `D`. Otherwise:

- `S`: score >= 85
- `A`: score >= 70
- `B`: score >= 55
- `C`: score >= 35
- `D`: score < 35

The receipt SHALL expose `instinctImpact` and `gradeScore`. The result screen
SHALL explain the three score inputs and SHALL never recommend the formation
already used.

## Numeric invariants

- Positions and corruption remain inside the 30x18 grid.
- Health, urgency, Instinct impact, and grade score remain in `[0, 100]`.
- Counters remain non-negative integers.
- At most three lights and at most `policy.interceptors` lights are assigned to
  intercept.
- Pulse clears are in `[0, 6]` and its shield duration is exactly 12 ticks.
- Assignment lookahead never grants an out-of-policy clear.
- Same seed + same Instinct + same Pulse tick produces identical assignments,
  paths, effects, receipt, and replay hash.

## Requirements

- `R1` The strategy screen SHALL label the character value as remaining.
- `R2` The live HUD SHALL summarize the sentence as formation, protected zone,
  interceptor budget, and pursuit rule.
- `R3` Every light SHALL expose what it is doing, where, and why.
- `R4` The arena SHALL render the protected boundary, optional pursuit boundary,
  formation anchors, assignment lines, target cells, and intercept impacts.
- `R5` Pulse SHALL be capped and visually framed as emergency intervention.
- `R6` The canonical 10-percent ring SHALL produce meaningful autonomous
  interception across deterministic seeds without clearing outside four cells.
- `R7` The result SHALL show Instinct impact and an explained grade score.
- `R8` Result recommendations SHALL be policy-aware and non-contradictory.
- `R9` Summary grammar SHALL handle singular and plural counters.
- `R10` Desktop, mobile, keyboard Pulse, pointer Pulse, reduced-motion, and
  same-grid tuning SHALL remain usable.
- `R11` Python formulas, golden vectors, TypeScript formulas, and sensitivity
  reports SHALL agree.

## Scenarios

### Words become visible tactics

GIVEN the sentence says `circle`, `within 10%`, `send two`, and `do not chase`
WHEN the live round begins
THEN the arena shows a four-cell ring, at most two intercept assignments, a
zero-pursuit boundary, and a reason for each light's assignment.

### Predict without violating the command

GIVEN a threat is three cells outside the protected radius
WHEN an interceptor stages for the breach
THEN its target and urgency are visible but it does not clear the threat until
the threat enters the protected radius.

### Pulse supports rather than replaces the Instinct

GIVEN a dense sector and an available Pulse
WHEN the player fires
THEN at most six closest-to-core cells clear, the core is shielded for 1.2
seconds, and the receipt separates Pulse from autonomous clears.

### Same-grid learning loop

GIVEN a resolved round
WHEN the player chooses `TUNE SAME GRID`
THEN the sentence and seed are preserved and changing one phrase produces a
comparable receipt.

### Truthful result

GIVEN a ring strategy with low health
WHEN the result recommendation is generated
THEN it may recommend more radius, more core focus, or fewer interceptors, but
never choosing ring again.

## Proof map

| Requirement | Proof |
|---|---|
| R1, R7-R9 | component/unit assertions and browser result inspection |
| R2-R5 | desktop/mobile screenshots and full-loop browser click-through |
| R3, R4, R6 | deterministic assignment tests, state assertions, arena screenshots |
| R5, R6 | 24-seed guided/no-Pulse sensitivity report per canonical strategy |
| R10 | pointer and keyboard playtests, resize screenshots, console inspection |
| R11 | Python reference checks, regenerated golden vectors, TypeScript parity tests |

## Completion boundary

The pass is complete only when focused tests fail before implementation, all
tests pass after implementation, Python/golden parity passes, sensitivity
reports satisfy the Pulse and autonomy bounds or disclose a remaining limit,
the production build succeeds, and desktop/mobile screenshots prove the full
loop without console errors.
