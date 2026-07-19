# GRIDWAKE Instinct Runtime v1 — Math Audit

Date: 2026-07-18  
Engine: `gridwake-local-v0.3`  
Contract: `specs/instinct-runtime-v1.md`

## Formula contract

### Language-to-radius heuristic

```text
radius_cells = clamp(round_half_up(percent / 100 * 18), 4, 14)
```

The 18-cell grid height is the normalization span. This is a control mapping,
not a physical-distance claim. Explicit cell values are clamped directly.

### Controlled entropy

Target and anchor variation comes from stable FNV-1a hashes of the round seed,
coarse time bucket, light identity, and candidate cell. Entropy scales a bounded
tie-break only. It does not consume the world-growth PRNG and cannot change unit
speed, direct damage, health, Pulse budget, or maximum interceptor count.

```text
tie_break = ((hash mod 2001) - 1000) / 1000 * entropy * 0.7
```

The score is a heuristic operating only over legal threats inside:

```text
maximum_range = engagement_radius + pursuit_limit
```

### Formation radius

Ring anchors use 16 integer direction vectors normalized to a Euclidean radius.
The anchor radius is:

```text
ring_radius = clamp(engagement_radius - 1, 2, 7)
```

Each light moves at most one orthogonal grid cell per movement decision. Organic
and erratic styles vary coarse anchor phase; disciplined movement does not.

### Intercept action

At most the compiled interceptor count receives threat assignments. Every sixth
tick, each light may remove at most one corruption cell within Manhattan distance
two. Direct intercepts, trail repairs, and Pulse clears have separate counters.

### Core-exposure trade-off

Wide coverage cannot leave the core free of cost once the network is saturated:

```text
exposure = 0  if tick mod 15 != 0
exposure = 0  if corruption < 70
exposure = 0  if defenders within 6 cells >= 2
exposure = 1  if defenders == 1
exposure = 2  if defenders == 0
```

Final damage is the bounded maximum of local breach, network overload, and
exposure damage. It remains in `[0,7]` per damage tick.

## Domains and invariants

- Grid positions: integer `x∈[0,29]`, `y∈[0,17]`.
- Engagement radius: integer `[4,14]` cells.
- Interceptors: integer `[1,3]`.
- Pursuit: integer `[0,8]` cells.
- Entropy and risk: integer `[0,100]`.
- Focus: three non-negative integer percentages summing exactly to `100`.
- Health: integer `[0,100]`.
- Same seed + policy + Pulse tick reproduces state, path, counters, and receipt.

## Validation evidence

- Python reference: `validation/causal_strategy_reference.py`
- Golden vectors: `validation/causal_strategy_golden.json`
- Product parity and invariants: `tests/engine.test.ts`
- Sensitivity artifact: `validation/causal_sensitivity_report.json`

Observed commands:

```bash
python3 validation/causal_strategy_reference.py
python3 -m unittest discover -s validation -p 'test_causal_strategy_reference.py' -v
npm test
npm run build
./node_modules/.bin/vite-node validation/run_sensitivity.ts
```

Observed results:

- Python Instinct reference: 4/4 tests pass.
- TypeScript runtime/compiler/parity: 14/14 tests pass.
- Production build: pass.
- Sensitivity: 4 policies × 24 seeds × 2 Pulse modes = 192 rounds.
- Guided Pulse: 96/96 hold.
- No Pulse: 93/96 hold and 3/96 lose.
- No NaN, infinity, out-of-grid position, negative counter, focus drift, replay
  nondeterminism, or action-budget violation was observed in the checked suite.

## Known limits

- The local interpreter is a bounded heuristic, not a general language model.
- The ten-percent ring is clamped to the four-cell minimum so it remains a
  playable tight defense rather than compiling into a functionally inert range.
- The sensitivity corpus is a deterministic calibration fixture, not evidence
  of population balance or fun.
- The browser remains non-authoritative and local receipts can be forged.
- FNV-1a and the LCG provide reproducibility, not cryptographic randomness.
- Multiplayer, server signing, model calls, accounts, and ChatGPT/Codex control
  remain outside this implementation.
