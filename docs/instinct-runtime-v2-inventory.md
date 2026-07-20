# Instinct Runtime v2 — Implementation Inventory

**Baseline:** `ab99c0ab332c9eaa032eb866fa4fe53656840727`  
**Branch:** `instinct-runtime-v2`  
**Pre-flight:** `npm ci` + `npm run verify` — **PASS** (102 TypeScript tests, golden + sensitivity, build)

---

## 1. Fully implemented

| System | Location |
|--------|----------|
| Keyword → bounded `StrategyPolicy` compiler | `src/game/strategy.ts` |
| Provenance / ignored-word reading (tests) | `compileStrategyWithReading`, `tests/strategy-reading.test.ts` |
| StrategyPreview mini-grid | `src/components/StrategyPreview.tsx` |
| Six-second Override + occupy-only clears | `OVERRIDE_MAX_TICKS`, `engine.ts` |
| Manual vs autonomous clear separation | `manualClears` / `interceptClears` |
| Probe / Surge / Collapse | `phaseForTick` |
| Same-seed rematch comparison | `comparison.ts`, ResultScreen |
| Multiplayer per-role dial ownership | `squadStrategy.ts` |
| Deterministic hashing / Python golden | `strategyHash`, `causal_strategy_reference.py` |
| 31-case corpus + 9 reading + 7 squad tests | `tests/strategy-*.test.ts` |

## 2. Partially implemented

| Feature | Gap |
|---------|-----|
| Negation | Pursuit phrases only |
| Contradictions | Silent precedence; never blocks WAKE |
| Role clauses | Multiplayer only (separate sentences); solo is one blended policy |
| Evidence | String fragments, not character spans |
| Risk / aggressive | Compiles; weak / undocumented engine effect |
| Provenance UI | Compiler ready; ProgramScreen quiet-pass removed it |
| Metamorphic paraphrases | Hand-picked corpus only |

## 3. Missing (v2 goals)

- Canonical plan IR (`CanonicalStrategyPlan` / directives)
- Conditions that affect engine (phase / health / threat-within)
- Scoped negation grammar
- Role-scoped clauses in one solo sentence
- Character-offset evidence spans
- Contradiction clarification that blocks WAKE
- Phrase → action attribution on ResultScreen
- Systematic metamorphic + Edge-Hunter causal suite
- `local-instinct-v2` compiler label + engine version bump

## 4. Visual but not mechanical

| Surface | Issue |
|---------|-------|
| StrategyPreview interceptor halos | Index order ≠ `assignLights` |
| Solo Instinct role order | Cosmetic; shared policy |
| Risk dial | Not meaningfully executed as named engagement style |

## 5. Must preserve

Override budget, occupy-only manual clears, phase pacing, StrategyPreview (upgrade not replace), receipt separation, multiplayer dial ownership, deterministic LCG/hash, `StrategyPolicy` as compatibility adapter, Python golden parity discipline.
