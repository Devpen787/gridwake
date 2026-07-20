# Instinct Fidelity v1 — historical sentence corpus contract

> **Superseded for runtime behaviour by** [`instinct-runtime-v2.md`](./instinct-runtime-v2.md).
> This document remains as the Gate 1 characterization history for the former
> `local-prototype` keyword matcher.

## Current truth (historical)

`src/game/strategy.ts` formerly compiled one normalized sentence into a bounded
`StrategyPolicy` via keyword signals. That path is now a **compatibility facade** over
`src/game/instinct/` (`local-instinct-v2`). Corpus coverage lives in
`tests/instinct-corpus.test.ts` (≥100 cases), metamorphic and Edge-Hunter suites.

## Delta retained from v1

Characterization findings from the original 30-sentence corpus (pursuit regex,
percent-radius clamps, contradiction precedence) informed v2 conflict rules and
clamping. Ring-vs-Spread is now a **blocking** contradiction rather than silent
precedence.

## Proof map (v2)

- `npm test` — 204 TypeScript tests including instinct corpus / metamorphic / edge-hunter.
- `npm run validate:golden` — contract `gridwake-instinct-runtime-v2`.
- `npm run verify` — typecheck, tests, build, golden, sensitivity.
