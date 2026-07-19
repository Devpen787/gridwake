# GRIDWAKE — Formal Contract and Validation Report

Status: executable design reference plus playable cell-engine parity  
Date: 2026-07-18  
Result: local causal-policy gate passes; multiplayer sector calibration remains blocked

## 0. Playable solo engine validation (`gridwake-local-v0.3`)

This report originally covered the future multiplayer sector abstraction below.
The shipped solo cell engine now has a separate, narrower proof package:

- `specs/causal-strategy-playable-round.md`
- `specs/instinct-runtime-v1.md`
- `docs/GRIDWAKE_INSTINCT_RUNTIME_V1_AUDIT.md`
- `validation/causal_strategy_reference.py`
- `validation/causal_strategy_golden.json`
- `validation/run_sensitivity.ts`
- `validation/causal_sensitivity_report.json`
- `tests/engine.test.ts`

The compiler uses integer largest-remainder allocation. For hit counts
`h=(h_core,h_edge,h_link)`, raw weights are `w_i=2+3h_i`; integer percentages
are `floor(100w_i/sum(w))`, with remaining points assigned by descending integer
remainder and stable core/edge/link order. Therefore all three values are bounded
and sum to exactly 100 without cross-language floating-point drift.

Pulse guidance is exact:

```text
FIRE  when health <= policy threshold OR threat >= 76
READY when threat >= 54 OR health <= policy threshold + 15
HOLD  otherwise
```

Instinct Runtime v1 adds bounded formation, engagement radius, interceptor
count, pursuit, movement style, and entropy fields. Entropy only breaks
equivalent target/anchor choices and never changes speed, direct damage, health,
or the Pulse budget. The full formula contract and current calibration results
are recorded in `GRIDWAKE_INSTINCT_RUNTIME_V1_AUDIT.md`.

Trail repair throughput is policy-bounded: at most one cell per 10 ticks for
link focus >=50, per 15 ticks for focus >=25, otherwise per 20 ticks. Pulse is a
single state transition, clears the current worst-pressure sector, and grants a
30-tick deterministic damage shield. Trail repairs and Pulse clears have separate
counters and receipt fields.

Fresh observed proof:

- 14 TypeScript engine/compiler/parity tests pass.
- 21 Python tests pass across the original sector reference and new causal-policy
  reference.
- Four reference policies × 24 seeds × two Pulse modes = 192 cell-engine rounds.
- Guided Pulse: all 96 rounds hold; final health ranges from 45 to 96.
- No Pulse: 93/96 hold and 3/96 lose; final health ranges from 0 to 95.
- Edge Hunter averages 72 direct intercepts but pays core-exposure damage,
  finishing at average health 83 even when corruption never reaches the core.
- Ring Keeper averages health 63 with guided Pulse and 28 without it.
- The deliberately narrow ten-percent ring is clamped to the four-cell playable
  minimum, averages one direct intercept, and loses 1/24 no-Pulse rounds.

This is a meaningful local sensitivity gate: policy changes paths and metrics,
Pulse timing changes survival, and both held and lost outcomes exist. It is not a
population balance claim. The 24 seeds are deterministic calibration fixtures,
not production telemetry or statistical evidence of fun.

### Solo security boundary

The local browser client is reproducible, not authoritative. A player who edits
JavaScript or memory can forge local state and a local receipt. The UI labels the
receipt `NOT SERVER SIGNED`; no score, reward, leaderboard, or multiplayer claim
may trust it. Production cheat resistance requires an authoritative server,
authenticated one-shot action ledger, committed seed, replay verification, and
signed receipt. Those are designed below but remain unimplemented.

## 1. What this report proves—and does not

The checked-in Python model proves that one provisional sector-level contract:

- uses integer-only deterministic arithmetic;
- produces the same replay hash for the same inputs;
- is invariant to action arrival order and player identity labels;
- enforces legal state, room-size, law, and action-count bounds;
- makes distributed coverage outperform a fixed herd in the tested abstraction;
- rejects world-law fields outside a narrow allow-list.

It does **not** prove that a future TypeScript/Rust engine implements the contract,
that the cell-level game is fun or balanced, that networking/authentication is
secure, that GPT compilation is safe, or that the deployed system cannot be
hacked. Formal properties are always properties of a specific model and set of
assumptions.

## 2. Contract version and domains

Contract ID: `gridwake-sector-reference-v1`

| Symbol | Meaning | Exact domain / unit |
|---|---|---|
| `n` | committed active lights | integer `[2,24]` |
| `t` | tick | integer `[0,599]`; 10 ticks/s |
| `j` | logical sector | integer `[0,7]` |
| `P_j(t)` | sector pressure | integer `[0,10000]` pressure units |
| `H(t)` | core health | integer `[0,10000]` health units |
| `k_j(t)` | contributing lights in sector | integer `[0,n]` |
| `u_j(t)` | accepted pulse count in sector | integer `[0,n]` |
| `R_i` | remaining pulses for player `i` | integer `{0,1}` |
| `L` | certified world law | typed bounded integer object |
| `s(t)` | PRNG state | unsigned 32-bit integer |

The sector model abstracts a future cell grid. It is a balance and determinism
reference, not permission to skip cell-level vectors.

## 3. Exact arithmetic

All divisions are floor integer divisions. `clamp(x,a,b)=min(b,max(a,x))`.

### 3.1 Corruption budget

Baseline per tick:

```text
B0(n) = 15 + 24n + floor(sqrt(100n))
B(n,L) = floor(B0(n) * L.corruption_permille / 1000)
```

The budget is divided by eight. Each sector receives `floor(B/8)` and the
remainder is assigned to consecutive sectors beginning at `LCG(s) mod 8`.

Portable PRNG:

```text
s(t+1) = (1664525*s(t) + 1013904223) mod 2^32
```

This is a reproducibility primitive, not a cryptographic RNG. A cryptographic
commit/reveal protocol must create the seed; the LCG only expands it for game
events.

### 3.2 Defense and congestion

For `k=0`, `D0(k)=0`. For `k>=1`:

```text
base(k)    = floor(40*k*100 / (100 + 12*(k-1)))
synergy(k) = 0                       when k < 2
             8 * min(k,4)            when k >= 2
D(k,L)     = floor((base+synergy) * L.defense_permille / 1000)
```

Two distinct lights unlock the synergy. Same-sector congestion makes per-light
effectiveness non-increasing after that threshold. This creates an incentive to
cover rather than pile onto one focal point without assigning individual score.

### 3.3 Pulse

In the reference, each accepted sector pulse subtracts `L.pulse_strength`,
default 220. Simultaneous pulses stack by count rather than selecting a
latency-dependent “first” sender. The production action ledger SHALL enforce:

```text
accepted_pulses(player, round) <= 1
```

Duplicate idempotency keys return the original result and do not spend again.
The reference simulator never spends more pulses than active lights.

### 3.4 Simultaneous pressure and health update

```text
P_j(t+1) = clamp(P_j(t) + growth_j(t) - D(k_j(t),L)
                 - pulse_j(t), 0, 10000)

E(t+1)   = sum_j max(0, P_j(t+1) - 5000)

deltaH   = +10                    when E = 0
           -floor(E/120)          when E > 0

H(t+1)   = clamp(H(t) + deltaH, 0, 10000)
```

The round is a shared win iff tick 600 is completed and `H>0`.

### 3.5 Law envelope

| Field | Inclusive range | Immutable outside law? |
|---|---:|---|
| `corruption_permille` | 800–1200 | no |
| `defense_permille` | 900–1100 | no |
| `pulse_strength` | 120–320 | no |
| `repair_distinct_players` | 2–3 | no |
| every other field | rejected | yes |

The `repair_distinct_players` field is schema-tested but not consumed by the
sector abstraction; the future cell repair model must add behavior and vectors
before that field can be enabled in a real law. Until then it SHALL remain fixed
at 2 in production.

## 4. State-machine safety properties

These are implementation requirements, not all proven by the Python abstraction.

### S1 — Phase authority

`program_light` changes policy only in `PROGRAM`; `pulse` queues only in `PLAY`;
world-law proposals never change the current committed round.

### S2 — One owner, one active light

For committed round `r`, a room capability maps to at most one player ordinal and
one light. Capabilities are unforgeable, short-lived, room/round scoped, and
revoked on enforcement.

### S3 — One pulse

The transition from `available` to `spent` is atomic with accepted server event.
All later distinct requests are rejected; exact retries are idempotent.

### S4 — Simultaneous resolution

Let `A_t` be the multiset of accepted legal actions for tick `t`. For every
permutation `σ`, `Resolve(S_t,A_t)=Resolve(S_t,σ(A_t))`.

### S5 — Identity blindness

Replacing account IDs, callsigns, or OAuth subjects while preserving committed
ordinals and policy/action multiset does not change aggregate state or outcome.

### S6 — Deterministic replay

Engine version, initial state, law, seed, policies, and ordered accepted live
events uniquely determine every state and the final hash.

### S7 — Boundedness and totality

Every legal input produces a next state within numeric bounds within the tick
budget. Illegal, missing, late, or over-budget policy output becomes `HOLD`.

### S8 — Constitution confinement

No world law can add a field, observation, action, tool, side effect, identity
predicate, or change to authentication, moderation, persistence, receipt,
scoring, validator, or seed semantics.

### S9 — Truthful receipt state

Only a receipt whose signature and full deterministic recomputation pass may be
labeled `verified`. Pending, interrupted, invalid, and unverifiable are distinct.

### S10 — Difficulty commitment

Roster and difficulty inputs freeze before seed reveal. A late join or disconnect
cannot silently change current-round pressure.

## 5. Executable validation

Artifacts:

- `validation/gridwake_reference.py`
- `validation/test_gridwake_reference.py`
- `validation/golden_vectors.json`
- `validation/sensitivity_report.json`

Fresh command:

```bash
cd /Users/devinsonpena/Documents/Hackathons/gridwake/validation
python3 gridwake_reference.py --write-artifacts --seed-count 200
python3 -m unittest -v test_gridwake_reference.py
```

Observed result on 2026-07-18: **17 tests passed in 10.276 seconds** after artifact
generation. The suite covers budget monotonicity, room-size rejection, defense
congestion, law-edge acceptance and escape rejection, PRNG vector, action-order
and identity-label invariance, simultaneous pulse stacking/order invariance,
numeric bounds, invalid state/action rejection, canonical JSON, replay
repeatability and input sensitivity, pulse limits, corpus bounds, coordination
comparison, and checked-in vector parity.

The corpus invariant loop covers:

```text
5 room sizes * 30 seeds * 4 policy archetypes = 600 complete/adversarial rounds
```

The separate sensitivity artifact covers:

```text
5 room sizes * 200 seeds * 4 policy archetypes = 4,000 rounds
```

## 6. Sensitivity result and calibration verdict

| Players | Balanced wins | Fixed-herd wins | Waste wins | Idle wins |
|---:|---:|---:|---:|---:|
| 2 | 200/200 | 0/200 | 0/200 | 0/200 |
| 4 | 200/200 | 0/200 | 0/200 | 0/200 |
| 8 | 200/200 | 0/200 | 0/200 | 0/200 |
| 16 | 200/200 | 0/200 | 0/200 | 0/200 |
| 24 | 200/200 | 0/200 | 0/200 | 0/200 |

Balanced runs end at full health and do not need a pulse. Herd/waste/idle runs
collapse to zero. The mechanism therefore has a strong coordination gradient,
but it is **not acceptably calibrated**: the tested archetypes are completely
separated, seed variation is not meaningful enough, and the signature live
decision is unused under competent play.

This is a formal validation finding, not a success to conceal.

Calibration SHALL remain blocked until player testing and a richer model produce:

- non-degenerate seed and policy outcome distributions;
- pulse use in a meaningful but non-mandatory fraction of baseline wins;
- recoverable near-loss states rather than only untouched wins or collapse;
- a documented target win band by room size, with confidence intervals;
- challenge changes that do not make adding a useful player harmful;
- law-envelope sweeps that do not create automatic wins or impossible rooms.

No target percentages are invented here; they require playtest goals and data.

## 7. Can it be gamed or tricked?

No honest review can guarantee “cannot.” The useful question is which manipulations
are impossible by construction, which are detectable, and which remain.

### Prevented in the specified mechanism

- A client cannot directly set position, pressure, health, result, seed, or law.
- Display name, account identity, and packet arrival order cannot improve the
  deterministic aggregate result.
- Repeating a pulse nonce cannot produce a second effect.
- A generated law cannot name a player or introduce a new field/tool/action.
- A single light cannot claim distinct-light repair twice.
- An unverifiable receipt cannot validly become verified without recomputation.

These remain requirements until implementation tests establish them.

### Mitigated, not eliminated

- **Griefing:** no direct attack action, but legal wasteful routes remain.
- **Sybil capacity attack:** no economic reward and no binding anonymous vote,
  but distributed identities can still occupy rooms or signal preferences.
- **Collusion:** shared results remove prize/kingmaking incentives, but external
  groups may still enjoy disruption.
- **Prompt injection:** schema/parser confinement blocks runtime escape only if
  tool authority, logging, error handling, and model inputs are implemented safely.
- **Operator bias:** commitment and verifier reveal inconsistency, but a malicious
  operator controls availability, deployment, keys, and which rooms are offered.
- **Latency:** simultaneous resolution removes order advantage; a player can still
  miss a pulse deadline due to network conditions.
- **Model drift:** policy acceptance is deterministic, but compilation quality and
  refusal rates can change unless model snapshot/prompt/version are pinned and
  evaluated.

### Inherently unprovable from this model

- one online identity equals one human;
- a human did not coordinate out of band;
- browser/device/server/signing key was uncompromised;
- moderation catches every harmful semantic intent;
- a verified deterministic outcome was enjoyable or socially fair;
- future code has no vulnerability.

## 8. Required next verification layers

1. Cell-level canonical engine specification with integer vectors.
2. Independent implementation parity, including replay byte format.
3. Property-based/stateful fuzzing for phase, pulse, idempotency, reconnect,
   collision, law, and receipt behavior.
4. Model compiler adversarial corpus with prompt injection, Unicode, oversized,
   recursive, ambiguous, discriminatory, inert, and covert-channel inputs.
5. Network fault injection: duplicate, missing, delayed, reordered, replayed,
   cross-room, expired, and forged commands.
6. Authorization matrix tests for browser, ChatGPT, Codex, host, moderator, admin.
7. Cryptographic protocol review of seed commitment, receipt key lifecycle, and
   public verifier supply chain.
8. Load/soak at 24 humans and 50 synthetic clients, with tick and broadcast data.
9. Human balance, accessibility, abuse, and comprehension studies.
10. Repo-grounded threat model, security scan, penetration test, rollback and
    incident exercise against the exact release artifact.
