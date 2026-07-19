# GRIDWAKE crash-resume contract

This file is the first read after any interruption, credit cutoff, app restart, or
context compaction. It is operational, not promotional.

## Role

You are the sole engineer-designer on GRIDWAKE, a 60-second deterministic strategy game
where one natural-language sentence commands a three-light squad. You optimise for a
truthful, playable, beautiful demo — never for the appearance of progress.

## Ground truth protocol

1. Before any work: read this file, then the active spec in `specs/`. Files are the only
   memory that survives; never trust recalled state.
2. After any work: update this file with the exact result, the exact failure (if any),
   and the next executable action. Update doc claims (test counts, capabilities) in the
   same commit that changes them.

## Prime directive: one gate at a time

Work only on the lowest incomplete gate. Never start a gate while the one below it is
unverified. Never add a new mechanic, screen, or dependency that no current gate requires.

- **Gate 1 — Sentence fidelity** (ACTIVE): 30+ sentence corpus test (paraphrases,
  contradictions, zero-keyword input) asserting exact compiled policy; "understood vs
  ignored" feedback UX. Optional GPT-5.6 compile path that emits the same bounded
  `StrategyPolicy`, clamped identically.
- **Gate 2 — Learnability**: result screen traces each policy dial to the sentence
  fragment that set it; same-seed rematch for A/B comparison of sentences.
- **Gate 3 — Pulse agency** (only if playtests show mid-round passivity): player-chosen
  sector.
- **Gate 4 — Multiplayer authorship**: per-role compilation; reducer test proves one
  player's sentence cannot mutate another light's policy.
- **Gate 5 — Network truth**: production room across two real networks; restrictive-NAT
  failure shows an honest recoverable error.
- **Gate 6 — Presentation**: visual gap list vs `design/PHOSPHOR_NOIR.md` and
  `design/reference/gameplay-north-star.png` (bloom, right-angle circuit trails,
  boundary-crust corruption, grid displacement, HUD framing), demo recording.
  (A suspected mid-width landing clip was disproven: no horizontal overflow at 1920px;
  it was a screenshot artifact.)

## Loop per slice

1. Write/update the spec (current truth first, then the delta).
2. Implement the smallest end-to-end behaviour.
3. Re-read the diff for scope drift and false claims.
4. Run the full gate: `npm run typecheck && npm test && npm run build`,
   `./node_modules/.bin/vite-node validation/run_sensitivity.ts`,
   `python3 -m unittest discover -s validation -p 'test_*reference.py'`,
   plus the relevant browser journey.
5. Fix every release-blocking failure before proceeding.

## Engineering constitution

- Determinism is sacred: all randomness flows from the seeded LCG/hash helpers in
  `src/game/math.ts`; identical seed + strategy = identical `replayHash`, always,
  including any model-assisted compile path.
- Engine stays pure functions; rendering reads state, never mutates it.
- Strict TypeScript, no `any`, small single-responsibility files.
- No new runtime dependency without one sentence of justification in the spec.

## Honesty constitution

- Never claim a capability that lacks a passing test or a recorded proof.
- Prototype surfaces keep the `LOCAL PROTOTYPE` label until replaced.
- Host-authority P2P limitations stay documented; do not soften them.

## Visual constitution

- `design/reference/gameplay-north-star.png` is the target image;
  `design/PHOSPHOR_NOIR.md` is law (tokens, motion timings, allowed copy).
- Every visual change must trace to a line in `PHOSPHOR_NOIR.md` or add one.
- Reduced-motion always degrades gracefully to crossfades.

## Current verified truth

- Solo Instinct Causality v2 is playable and deterministic.
- 89 TypeScript tests pass (engine 19, room 12, result analysis 2, instinct corpus 35,
  instinct reading 9, squad composition 7, possess 5), plus Python golden parity and
  sensitivity rounds. Typecheck and production build pass.
- The program screen now shows understood-vs-ignored: every dial carries provenance
  (stated ← evidence, DEFAULT, or amber RAISED TO MINIMUM / CAPPED AT MAXIMUM ← evidence)
  and unmatched content words appear in an IGNORED row. Verified in the browser on the
  dev build, including the ten-percent clamp and zero-signal error path.
- The compiler now has a characterization contract: `tests/strategy-corpus.test.ts`
  locks 30 sentences plus rejection/normalization cases. Six findings recorded in
  `specs/instinct-fidelity-v1.md`; the pursuit-distance regex defect is fixed in both
  TS and the Python reference (golden vectors unaffected, parity passes). The
  ten-percent-ring clamp is re-scoped to the understood-vs-ignored UX slice.
- Incidental repair: the Python suite had pre-existing drift (outdated
  `performance_grade` arity, golden comparison missing `with_grade_results`); the full
  21-test Python suite now passes again.
- P2P online multiplayer is implemented as a beta and proven in a two-tab WebRTC room;
  production alias https://gridwake.vercel.app is deployed and verified at HTML/JS level.
- Supabase is explicitly out: no project capacity.
- Multiplayer launch compiles per-role: each player's sentence owns their role's dials
  (guardian: shape/radius/movement/pulse, scout: interceptors/pursuit/risk, mender:
  link focus). Zero-signal instincts are rejected at lock-in with compiler guidance.
  The deployed production build predates this — Gate 5 starts with a redeploy.
- Known presentation gaps remaining after Premium Feel v1: true Pixi bloom/displacement
  filters (optional), audio pack (deferred), demo recording (Gate 6 remainder).

## Active slice

Gate 5 — network truth. Production redeploy with premium feel is DONE
(https://gridwake.vercel.app). Remaining: two real-network room proof + restrictive-NAT
failure exercise (needs two physical devices / networks; agent cannot complete alone).
Gates 1, 2, and 4 are closed; Gate 3 waits on human playtests.
Possess Light v1 (solo) and Premium Feel v1 are shipped.

## Next executable actions

- [x] Write instinct-fidelity v1 spec (current compiler truth + corpus contract).
- [x] Add table-driven sentence corpus test locking in compiled policies.
- [x] Run tests/typecheck; record surprising compilations as findings (6 recorded).
- [x] Fix finding 2 (pursuit regex with object) in TS + Python; corpus updated.
- [x] Re-scope finding 1 (percent-radius clamp) to the feedback UX; rationale in spec.
- [x] Add "understood vs ignored" feedback to the compile UX, including the resolved
      radius so clamps are visible (findings 1, 3-5 are input).
- [x] Decision: no runtime GPT-5.6 compile path. Rationale (user + engineering): a
      runtime model dependency cannot be relied on for availability or consistency this
      close to the deadline; the local matcher stays the sole compiler. GPT-5.6/Codex
      remains build provenance only, exactly as the README states. Gate 1 is CLOSED.
- [x] Gate 2: result screen now shows "YOUR WORDS → THIS ROUND" (sentence + eight dials
      with provenance) via shared `src/components/instinct-dials.ts`; browser-verified
      through a full round. Spec: `specs/learnability-v1.md`. Same-seed rematch was
      already present as TUNE SAME GRID. Gate 2 is CLOSED pending human playtests.
- [ ] Gate 3 decision needs human playtests (does the mid-round feel passive?). Skip
      unless playtests say otherwise.
- [x] Gate 4: per-role compilation shipped (`src/multiplayer/squadStrategy.ts`,
      reducer validation at lock-in, role cards state owned dials, solo-only result
      trace). Spec: `specs/per-role-compilation-v1.md`. Gate 4 is CLOSED.
      Deferred: per-member words→round trace on the multiplayer result screen.
- [x] Possess Light v1 (solo): `1`/`2`/`3` possess, WASD/arrows move, Esc release.
      Same move budget as autopilot; possessed lights clear like interceptors;
      replay hashes possession + steps. Multiplayer disabled (`allowPossess={false}`).
      Spec: `specs/possess-light-v1.md`. Engine version → `gridwake-local-v0.5`.
- [x] Quiet-pass (user feedback): strip program dial grid / IGNORED / entropy,
      strip in-game threat+live-instinct+per-light intention strip to health / timer /
      pulse / one intention, strip result words→round panel. Provenance reading
      stays in the compiler for tests; UI no longer dumps it.
- [x] Atmosphere restore: richer grid/atmosphere, circuit trails, soft diamond core
      mark (outline only), stronger light glow, pulse fill, HUD vignette + bracketed
      timer + pulse polish — without reintroducing dashboard chrome.
- [x] Premium Feel v1 (Gate 6 juice): crust corruption, pulse grid warp, impact/core/
      possess claim juice; segmented health + pulse kick + arena shake; grade-first
      result card with hero stats + quiet seed/replay footer. Spec:
      `specs/premium-feel-v1.md`. PHOSPHOR_NOIR motion timings updated. No new npm deps.
      Browser-proven solo round → grade-first result (A / 78, hero intercepts/repairs/
      pulse). 89 tests; typecheck + build pass.
- [x] Gate 5 deploy: production redeployed 2026-07-19
      (`dpl_C5wAvai3jcwTJFCsSLBPbdhiXMwH`) aliased to https://gridwake.vercel.app.
      Asset proof: CSS contains `performance-card`, `health-track--segmented`,
      `arena-kick-damage`; JS contains `POSSESS ·` / `GRADE`. Landing renders.
- [ ] Gate 5 remaining: prove a room across two physically separate devices/networks;
      exercise restrictive-NAT failure path (Trystero reports
      `Peer connection failed: …`; no custom TURN configured).

## Carry-over unproven claims (from pre-gate work)

- [x] Open production in a clean browser runtime and verify rendered UI (landing +
      premium asset fingerprints, 2026-07-19).
- [ ] Prove a production room across two physically separate devices or networks (Gate 5).
- [ ] Exercise restrictive-NAT failure handling; custom TURN is not configured (Gate 5).

## Stop conditions

Stop only for an externally controlled condition: credits or execution environment
unavailable; a paid/account action requiring approval; deployment ownership or policy
facts only the user can supply; or the same blocker failing three distinct approaches.
At any stop, write the exact failure and next safe action here first.
