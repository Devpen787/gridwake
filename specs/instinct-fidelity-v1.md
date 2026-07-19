# Instinct Fidelity v1 — sentence corpus contract

## Current truth

`src/game/strategy.ts` compiles one normalized sentence (NFKC, collapsed whitespace,
280-char cap) into a bounded `StrategyPolicy` via keyword signals and three regex
extractors (pulse threshold, radius in cells or percent, pursuit distance). A sentence
with zero recognised signals throws. The compiler is deterministic and pure; it is
labelled `local-prototype` and every downstream system (engine, receipts, multiplayer
launch) consumes only its bounded output.

Until now the compiler had no direct contract tests: engine tests exercised it
incidentally through four reference tactics. Nothing locked its behaviour against
regression, and nothing documented how paraphrases, contradictions, or garbage input
resolve.

## Delta in this slice

Add `tests/strategy-corpus.test.ts`: a table-driven corpus of 30+ realistic sentences,
each asserting the exact compiled policy (focus, formation, radius, interceptors,
pursuit, movement, entropy, risk, pulse threshold). Categories:

1. The four shipped examples plus the default strategy (players see these first).
2. Paraphrases per formation (ring / spread / link / balanced fallback).
3. Numeric extraction and clamping (radius in cells and percent, pulse threshold,
   pursuit distance, interceptor counts including word numbers and "all three").
4. Contradictions and precedence (e.g. "chase" + "do not chase", "spread" + "ring").
5. Rejection and normalization (zero-signal input throws, empty throws, case and
   whitespace produce identical policies, over-length input truncates at 280).

These are characterization tests: they lock in current behaviour so the compiler can be
rewritten (including a future GPT-5.6-backed path emitting the same bounded policy)
against a fixed contract. Surprising resolutions discovered while building the corpus
are recorded below as findings, not silently changed.

## Proof map

- `npm test` — corpus passes alongside the existing 31 tests.
- `npm run typecheck` — clean.
- Findings section below lists every behaviour the corpus revealed that a designer
  might want to change later; changing any of them is a new slice, not this one.

## Findings

Captured by the corpus (locked as current behaviour; changing any is a new slice):

1. **The shipped "TEN PERCENT RING" example does not deliver 10%.** `within 10%` of an
   18-row grid is 1.8 cells, clamped up to the 4-cell minimum. The example's label
   promises tighter defence than the compiler produces.
2. **Pursuit distance regex misses natural phrasing.** "chase **threats** for 4 cells"
   fails the `chase\s+(?:for|up to)?\s*N` pattern (object between verb and number) and
   falls back to the generic chase pursuit of 6 — the player asked for a *shorter*
   chase and got a *longer* one. "chase for 4 cells" works.
3. **"attack", "kill", and "hunt" always raise risk.** They sit in both the response and
   aggressive signal lists, so any sentence using them lands at risk ≥ 65 even when the
   rest of the sentence is defensive.
4. **Naming a movement style beats implying one.** Default entropy is 34; writing
   "organic"/"flow"/"naturally" raises it to 42. Players cannot know unnamed defaults
   differ from named ones.
5. **Formation precedence is fixed** (ring > spread > link > balanced) regardless of
   emphasis; "Spread wide in a tight ring" is a ring.
6. **Contradiction handling for chase is sensible**: any do-not-chase phrase zeroes
   pursuit even if "chase" also appears.

### Resolution status

- **Finding 2 fixed in this slice**: the pursuit regex now allows an object between the
  verb and the distance ("chase threats for 4 cells" → pursuit 4), bounded to a single
  sentence (no matching across `.;!?`). Fixed identically in `src/game/strategy.ts` and
  `validation/causal_strategy_reference.py`; golden vectors are unaffected because no
  fixture uses a numeric chase, and the parity suite passes.
- **Finding 1 re-scoped, not fixed**: the "TEN PERCENT RING" sentence is pinned by
  `causal_strategy_golden.json`, the Python reference, engine tests, and the sensitivity
  fixtures, so changing percent-radius semantics is a cross-fixture slice with no player
  benefit — the clamped 4-cell ring *is* a tight ring. The honest fix is transparency:
  the "understood vs ignored" UX must show the compiled radius ("4 CELLS · MINIMUM") so
  the player sees what 10% actually resolved to. Findings 3–5 feed the same UX.

## Slice 2: understood vs ignored

The interpretation panel in `ProgramScreen` shows compiled dial values but not their
provenance, so clamps (finding 1), risk coupling (finding 3), and silent defaults
(finding 4) are invisible, and words the compiler ignored disappear without a trace.

Delta:

- Each extractor in `src/game/strategy.ts` returns `{ value, provenance, evidence }`
  where provenance is `stated` (player words set it), `default` (nothing matched), or
  `clamped` (player asked outside bounds; `clamp: min|max` records the direction).
  `compileStrategy` output is unchanged — the corpus proves it.
- New export `compileStrategyWithReading` also returns an `InstinctReading`: eight
  dials (shape, radius, interceptors, pursuit, movement, risk, focus, pulse) with
  provenance and the evidence fragments, plus `ignoredWords` — content words that
  matched no signal, regex, or phrase (function words are filtered).
- `ProgramScreen` renders provenance under each dial (`← evidence`, `DEFAULT`,
  `CLAMPED TO MINIMUM/MAXIMUM ← evidence`) and an IGNORED row in the proof strip.
- Scope fence: the lobby instinct editor keeps its plain textarea; reading UX for
  multiplayer arrives with Gate 4's per-role compile.

Proof: `tests/strategy-reading.test.ts` (provenance for clamps, defaults, stated
values, evidence fragments, ignored words, and policy-equivalence between
`compileStrategy` and `compileStrategyWithReading`); full corpus unchanged; browser
journey on the program screen.

Status: **complete.** 9 reading tests pass; the 35-case corpus passes unchanged,
proving the refactor preserved compile behaviour; typecheck, build, sensitivity, and
Python parity pass. Browser journey verified on the dev build: the ten-percent
sentence shows "4 CELL RADIUS / RAISED TO MINIMUM ← WITHIN 10%" in amber, defaults
read "DEFAULT · NOT IN YOUR SENTENCE", ignored words ("gracefully") appear in the
proof strip, and zero-signal input still shows the guidance alert with WAKE disabled.

Correction to Gate 6's list: the suspected mid-width landing clip was a screenshot
tooling artifact. `document.scrollWidth` equals the viewport width at 1920px — no
horizontal overflow exists. Removed from the gate.

### Incidental repair

The Python suite had pre-existing drift unrelated to this slice:
`test_causal_strategy_reference.py` called `performance_grade` with an outdated 3-arg
signature and compared golden vectors against bare `vectors()` while the checked-in JSON
is written via `with_grade_results(...)`. The test now matches the current reference API;
the golden JSON itself was already correct and is unchanged.
