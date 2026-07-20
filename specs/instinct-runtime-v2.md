# Instinct Runtime v2 — Bounded Tactical Language

**Status:** Active implementation  
**Branch:** `instinct-runtime-v2`  
**Baseline:** `ab99c0ab332c9eaa032eb866fa4fe53656840727`  
**Compiler label:** `local-instinct-v2`  
**Engine version:** `gridwake-local-v0.6`

## Intent

Make writing a strategy the primary, reliable, and expressive way to play GRIDWAKE. Players wordsmith a sentence; GRIDWAKE shows what it understood; three lights execute deterministically.

This is a **bounded tactical language** expressed through natural prose — not unrestricted NL, not a chatbot, not runtime-generated code.

## Non-goals

- External models / APIs in this slice
- Arbitrary scripting or `eval`
- Silent auto-fire of Pulse
- Replacing Override, phases, receipts, or multiplayer ownership
- Two independent strategy engines (canonical plan **lowers** to `StrategyPolicy`)

## Canonical language

### Actors
`squad` | `guardian` | `scout` | `mender`

### Actions
`hold` | `orbit` | `screen` | `intercept` | `repair` | `follow` | `regroup`

### Targets
`core` | `nearest-breach` | `highest-urgency-breach` | `highest-pressure-sector` | `shared-trail` | `ally`

World-model mapping (shown to the player):

> “weakest edge” / “busiest edge” / “densest breach” / “most crowded sector”  
> → **highest-pressure boundary sector** (deterministic)

### Continuations
`return` | `hold` | `continue`

### Conditions
- `always`
- `core-health-below` { percent ∈ [15, 80] }
- `threat-within` { cells ∈ [1, 14] }
- `phase` { probe | surge | collapse }

### Engagement style (named, visible)
`cautious` | `balanced` | `aggressive`

**Aggressive mechanical effect (bounded):**
- Travel cost multiplier reduced (stronger commitment to assigned target)
- If no explicit leash stated, default leash = 6 cells
- **Does not** override scoped “do not chase” / explicit numeric leash 0

**Cautious:** opposite travel bias; default leash 2 when unspecified.

### Formation
`ring` | `spread` | `link` | `balanced` with radius ∈ [4, 14]  
Movement: `disciplined` | `organic` | `erratic`

### Directives
Each directive carries: actor, action, target, condition, responderCount (1–3|null), leashCells (null|0–8), continuation, engagementStyle, priority (1–3).

### Pulse guidance
Condition + target preference (`highest-pressure-sector` | `nearest-core-breach`). Player still fires Pulse.

## Parsing stages (deterministic)

1. **Normalize** — NFKC, whitespace, punctuation/apostrophes, 280-cap, number words one–eight, preserve spans  
2. **Segment clauses** — punctuation + connectors (`but`, `then`, `when`, `if`, `during`, `after`, `until`; unambiguous `unless`)  
3. **Resolve actor scope** — role / squad / count words; explicit role binds clause + continuation  
4. **Scoped negation** — before positive matches (`do not`, `don’t`, `never`, `no`, `without`, `avoid`, `stay away from`)  
5. **Action + target** — bounded paraphrases (see lexicon)  
6. **Modifiers** — counts, radius cells/%, leash, thresholds, qualitative overrides; numeric beats qualitative for same field  
7. **Conditions** — health / threat-within / phase / after-clear → return  
8. **Conflict resolution** — rules below  
9. **Validate + explain** — warnings, unresolved spans, blocking contradictions  
10. **Adapt** — lower plan → `StrategyPolicy` for engine compatibility

## Conflict rules

1. Role-specific overrides general squad for that role  
2. Numeric overrides qualitative for the same field  
3. Scoped negation overrides the directly negated positive action  
4. Later explicit instruction may override earlier for same actor+field  
5. Equally explicit incompatible formations → **blocking contradiction** (Ring vs Spread choices; WAKE disabled)  
6. Material low-confidence ambiguity → clarification required  

## Confidence rules

- `stated` evidence → high confidence (≥0.85)  
- `inferred` from context → medium (0.55–0.84)  
- `default` / `clamped` → lower; listed in `defaultsUsed`  
- Overall `confidence` = mean of directive confidences  

## Multiplayer ownership

| Role | Owns |
|------|------|
| Guardian | formation, radius, Guardian movement / defensive conditions, Pulse guidance |
| Scout | responder count, Scout target priority, pursuit, engagement style |
| Mender | repair targeting, link behaviour, Mender conditions |

Cross-role wording → warning; no silent mutation of another role’s fields.

## Compatibility with StrategyPolicy

`policyAdapter.planToPolicy(plan)` derives legacy dials:

| Plan | Policy |
|------|--------|
| formation.shape / radius / movementStyle | same |
| intercept directives + responderCount | `interceptors` |
| leashCells (or aggressive default) | `pursuitLimit` |
| engagementStyle | `risk` (cautious 35 / balanced 50 / aggressive 65) |
| orbit/hold/screen core | focus.core ↑ |
| highest-pressure / edge targets | focus.edge ↑ |
| repair / shared-trail | focus.link ↑ |
| pulseGuidance core-health-below | `pulseHealthThreshold` |
| entropy from movementStyle | 10 / 34 / 78 |

Engine still reads `StrategyPolicy` plus **condition-aware assignment** from the plan.

## Hashing

- **Plan hash** — canonical plan only (no source wording, evidence, confidence, warnings)  
- **Source hash** — normalized source text  
- Semantically equivalent sentences → same plan hash  
- Same seed + plan + ordered input → same `replayHash`  

## Engine integration

- Evaluate directive conditions each tick before assignment  
- Guardian: hold/orbit/screen core; respect radius/leash  
- Scout: target nearest / highest-urgency / highest-pressure; responder count; leash; continuation  
- Mender: prefer repair / shared-trail when instructed  
- Phase conditions use existing `phaseForTick` boundaries  
- Attribution: major autonomous actions tag `directiveIndex | default | override | pulse`  

## Player-facing interpretation

ProgramScreen strategy laboratory:

- Sentence workspace + larger StrategyPreview  
- Guardian / Scout / Mender interpretations  
- Evidence spans, defaults, clamps, unresolved, contradictions  
- EXAMPLE STRATEGIES (relabelled starters)  
- WAKE blocked on blocking contradiction or zero actionable directives  

StrategyPreview upgrades: sample threats, role reticles, leash, dormant phase directives, Pulse threshold marker — no fake win %  

ResultScreen: expandable **YOUR WORDS → THIS ROUND** attribution trace  

## Test corpus

≥100 compiler cases + metamorphic suite + Edge-Hunter A/B causal tests (exact sentence + five mutations from the mission brief).

## Manual acceptance

Twelve browser sentences from the mission brief (hug/ring, Guardian-Scout-Mender, do-not-chase, contradiction Ring/Spread, collapse regroup, Pulse 35%, do-not-attack, decorative prose, misspelling, zero-signal, paraphrase equivalence, mixed ownership).
