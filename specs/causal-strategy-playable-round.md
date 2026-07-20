# Change: `causal-strategy-playable-round`

Date: 2026-07-18

## Current truth to preserve

- The landing → strategy → awakening → 45-second round → receipt path works.
- The engine is deterministic for a fixed seed, strategy policy, and Pulse tick.
- The accepted visual direction is Phosphor Noir: a near-black field, cold grid,
  white core, cyan/amber/violet lights, red corruption, and minimal HUD.
- The UI truthfully labels the compiler and receipt as local prototypes.
- One Pulse per player per round remains the interaction budget.

## Defects this change closes

- Prompt text currently produces the same three fixed behaviors and an unused
  Pulse threshold.
- Prompt text also changes the world seed, so policy and scenario are confounded.
- Lights visibly rewind because interpolation resets on non-movement ticks.
- The renderer rebuilds the full grid and all trails every animation frame.
- Pulse targeting, threat, role actions, repairs, and strategy consequences are
  not legible during play.
- Pulse clears are mislabeled as trail repairs in the receipt.
- Ordinary rounds lack loss pressure and useful post-round learning.
- Mobile strategy, game, and result screens clip or hide primary controls.

## Scope in

- A deterministic local compiler that rejects non-tactical prompts and compiles
  recognized language into bounded, visible policy values.
- Policy values that materially alter target selection, formation, risk posture,
  Pulse recommendation, and light behavior.
- Seeds independent from prompt text, plus same-grid tuning and new-grid replay.
- Smooth fixed-step simulation presentation and layered Pixi rendering.
- Legible threat, three live role intentions, Pulse target/recommendation, recent
  events, and causal result analysis.
- Separate trail repairs and Pulse clears in state and receipt semantics.
- Calibrated stochastic sweeps across multiple policies and seeds.
- Desktop and 390×844 responsive repair with keyboard and reduced-motion checks.
- Python formula reference, golden vectors, TypeScript parity, engine invariants,
  browser click-through, screenshots, and console proof.

## Scope out

- GPT-5.6 API calls, credentials, remote MCP, rooms, networking, accounts,
  databases, moderation, deployment, and server-signed receipts.
- Production cheat resistance or authoritative multiplayer simulation.
- Economy, progression, leaderboards, purchases, or persistent profiles.

## Policy contract

The compiler SHALL emit:

- `focus.core`, `focus.edge`, and `focus.link`: integer percentages summing to 100.
- `formation`: `spread`, `balanced`, `link`, or `ring`.
- `risk`: integer 0–100; higher values accept more core exposure for coverage.
- `pulseHealthThreshold`: integer 15–80.
- `matchedSignals`: the tactical language actually recognized.

Unknown prose SHALL not be accepted as a meaningful strategy. The UI SHALL show
recognized signals and a useful correction instead.

## Numeric invariants

- Health remains an integer in `[0, 100]`.
- Policy focus values remain integers in `[0, 100]` and sum to `100`.
- Risk remains in `[0, 100]`; Pulse threshold remains in `[15, 80]`.
- Corruption and all light positions remain inside the 30×18 grid.
- Pulse can change state exactly once.
- Trail repairs and Pulse clears are non-negative and never share one counter.
- Same seed + same policy + same Pulse tick produces the same receipt.
- Changing policy on the same seed changes at least one canonical path or result
  metric for the supported reference strategies.

## Requirements

- `R1` The strategy input SHALL begin empty, with selectable example strategies.
- `R2` Compile SHALL reject prompts with no recognized tactical signal.
- `R3` Compile SHALL show the policy values and recognized language before launch.
- `R4` At least three materially different reference prompts SHALL yield different
  policies and different same-seed paths.
- `R5` Prompt text SHALL NOT determine the world seed.
- `R6` Simulation ticks SHALL remain deterministic while presentation interpolates
  smoothly without rewinding on non-movement ticks.
- `R7` Static grid geometry SHALL not be rebuilt every animation frame.
- `R8` Live play SHALL show core health, time, threat, Pulse target and guidance,
  and all three current role intentions.
- `R9` Pulse SHALL remain a single irreversible timing decision and SHALL report
  the sector and number of corruption cells cleared.
- `R10` The round SHALL expose escalating danger and allow both held and lost
  outcomes across the calibration seed set.
- `R11` Results SHALL explain strategy, trail repairs, Pulse clears, peak threat,
  damage taken, and a concrete next-round adjustment.
- `R12` Same-grid tuning SHALL keep the scenario seed; new-grid replay SHALL change it.
- `R13` Desktop and 390×844 SHALL show every primary control without horizontal
  clipping or hidden required actions.
- `R14` Reduced-motion mode SHALL suppress decorative CSS motion and continuous
  canvas interpolation while preserving legible state changes.
- `R15` The app SHALL continue to label the compiler and receipt as local.

## Scenarios

### Prompt changes policy

GIVEN the same round seed  
WHEN one player compiles a core-first prompt and another compiles a spread-edge prompt  
THEN focus values, formation, light paths, and at least one result metric differ.

### Unsupported prompt

GIVEN the strategy screen  
WHEN the player submits prose with no tactical signal  
THEN compile remains blocked and the UI names example tactical language.

### Smooth motion

GIVEN a light moves every second simulation tick  
WHEN an intervening tick changes corruption but not the light position  
THEN visual interpolation continues forward and never restarts the prior segment.

### Pulse semantics

GIVEN Pulse is available  
WHEN the player activates it  
THEN the current worst-pressure sector is cleared, the UI reports the clear count,
and a second activation changes nothing.

### Same-grid tuning

GIVEN a resolved round  
WHEN the player chooses Tune Same Grid and changes the prompt  
THEN the seed remains identical while the compiled policy and path may change.

### Mobile play

GIVEN a 390×844 viewport  
WHEN the player enters strategy, live play, and result  
THEN headings wrap, the arena fits, Pulse remains visible, and receipt content reflows.

## Proof map

| Requirement | Proof |
|---|---|
| R1–R5 | compiler unit tests, golden-vector parity, browser prompt comparison |
| R6–R7 | renderer code inspection, browser motion recording, console check |
| R8–R12 | engine tests, seed sweep, complete browser rounds and receipts |
| R13–R14 | desktop/mobile screenshots and reduced-motion inspection |
| R15 | browser DOM snapshots and screenshots |

## Completion boundary

This change is complete only when prompt causality, seed independence, balance
sweep, motion, desktop/mobile flow, build, tests, browser console, and concept
comparison all pass. GPT-5.6 and multiplayer remain explicit next changes.
