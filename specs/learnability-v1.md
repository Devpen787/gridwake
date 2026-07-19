# Learnability v1 — words → round trace

## Current truth

Gate 1 closed with a provenance-aware compiler (`compileStrategyWithReading`) and an
understood-vs-ignored panel on the program screen. The result screen showed metrics and
one recommendation, but did not connect the player's sentence to the round: after
playing, the sentence and the dials it set were gone. Same-seed rematch already exists
("TUNE SAME GRID" keeps the seed by not incrementing the round number).

Decision recorded at Gate 1 close: **no runtime GPT-5.6 compile path.** The game must
work for every player with zero keys, zero accounts, and zero third-party availability
risk. The local matcher remains the only compiler; model use stays build provenance.

## Delta in this slice

- Shared dial formatting extracted to `src/components/instinct-dials.ts` (used by
  program and result screens; one source of truth for provenance labels).
- Result screen gains a "YOUR WORDS → THIS ROUND" block: the exact sentence, then the
  eight dials with the same provenance notes (evidence fragments, DEFAULT, amber
  clamps). Combined with "TUNE SAME GRID", the player can change one phrase and compare
  the same seeded round.

## Proof map

- Typecheck, 75 TS tests, production build pass.
- Browser journey: default Instinct → 60-second round → result screen shows the trace
  block with correct provenance (defaults marked for radius/pulse, evidence for
  shape/movement), receipt intact, TUNE SAME GRID present.

## Quiet-pass correction

User feedback: the dial grid / IGNORED / entropy dump was too much surface noise.
The program screen now shows one summary line only (`RING · PROTECT 5 · …`). The
result-screen words→round panel was removed. Provenance reading remains in
`compileStrategyWithReading` (tests still lock it); it is no longer forced into the
player's face.
