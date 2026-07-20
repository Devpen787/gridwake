# Per-role compilation v1 — multiplayer authorship

> **Runtime note (instinct-v2):** each contribution compiles via `compileRoleScoped`
> (`local-instinct-v2`). Ownership of dials is unchanged; cross-role wording yields
> warnings instead of silently mutating another role’s fields. Compiler label on
> composed strategies is `local-instinct-v2`.

## Current truth

The lobby promises role ownership ("GUARDIAN · FORMATION + CORE", "SCOUT · THREATS +
PURSUIT", "MENDER · TRAILS + REPAIR"). Launch uses `composeSquadStrategy` to compile
each member's sentence under enforced role scope and assemble one squad policy.

## Delta in this slice

- `src/multiplayer/squadStrategy.ts` — `composeSquadStrategy(contributions)` compiles
  each member's sentence independently and assembles one squad policy from role-owned
  dials:
  - **Guardian** owns SHAPE (formation), PROTECT (engagement radius), MOVEMENT
    (style + entropy), and PULSE threshold.
  - **Scout** owns RESPONSE (interceptors), PURSUIT, and RISK.
  - **Mender** owns the LINK share of focus, which drives repair cadence.
  - FOCUS combines each role's own axis (guardian → core, scout → edge, mender →
    link), normalized to exactly 100 by largest remainder with deterministic
    tie-breaks. An absent role contributes the balanced default share (33).
  - Absent roles' dials use the compiler's documented defaults (balanced / 9 cells /
    organic 34 / pulse 35 / 2 interceptors / pursuit 2 / risk 50).
  - `matchedSignals` is the deduplicated union in role order; `instincts` is the fixed
    guardian → scout → mender order; `source` stays the combined display string.
- `applyRoomCommand` validates that a sentence compiles (not just its length) on
  `configure`, `set-instinct`, and `set-ready(true)`, rejecting with
  `invalid-instinct` and the compiler's guidance message. Launch composes per-role and
  rejects (never throws) if composition fails.
- Lobby role cards state the owned dials explicitly. The result-screen words→round
  trace is hidden in multiplayer for now: the reading of the combined string no longer
  matches the composed policy; a per-member trace is future work, not this slice.
- Seed derivation (`roomId:sequence:combinedSource`) is unchanged.

## Proof map

- `tests/squad-strategy.test.ts`: guardian's "do not chase" cannot zero the scout's
  pursuit; scout's formation words cannot move the guardian's shape; absent-role
  defaults; focus always sums to 100; identical contributions give identical
  `strategyHash`; three instincts in fixed order.
- `tests/room.test.ts` additions: zero-signal instinct rejected at lock-in with the
  compiler's message; launched strategy carries role-owned dials.
- Full gate: typecheck, all TS tests, build, sensitivity, Python parity (solo compile
  path untouched), browser journey: two-tab room, distinct sentences, launch, and a
  policy readout matching each owner.

## Status: complete

84 TS tests pass (7 new squad-composition, 2 new room tests); full gate green. Browser
proof on the dev build: NOVA created room NQ7KN3 as guardian ("Circle the core tightly
and do not chase"), a zero-signal instinct was rejected at lock-in with the compiler's
guidance, ECHO joined over the peer transport as scout ("Hunt threats at the edges and
chase for 6 cells"), and the launch commit read DISCIPLINED RING · PROTECT 5 ·
2 INTERCEPTORS · **CHASE +6** — the guardian's no-chase stayed personal, the scout's
pursuit won its own dial. Both peers resolved identically: grade A, replay `6f267a7a`,
status `P2P VERIFIED T450`.
