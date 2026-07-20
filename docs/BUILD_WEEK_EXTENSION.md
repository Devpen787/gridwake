# Build Week extension record

Submission window target: **21 Jul 2026 17:00 PDT** (22 Jul 2026 02:00 Zurich).

This file records work added during the Build Week extension polish pass on branch
`demo-final-polish`. Claims below are factual only; Session IDs are never fabricated.

## Baseline at polish start

| Field | Value |
| --- | --- |
| Baseline branch | `main` |
| Baseline commit | `ac10325` (`Document GitHub publication in CONTINUATION.`) |
| Production preview | https://gridwake.vercel.app |
| Round duration (executable) | 45 seconds (`ROUND_SECONDS` / `ROUND_TICKS`) |
| Compiler | Local keyword matcher only — **not** an OpenAI runtime API call |
| Multiplayer | Trystero P2P; host-ordered log; unsigned local receipts |

## Tool roles

| Role | Tool | Scope |
| --- | --- | --- |
| Judged-core implementation (Prompts 01–08) | Cursor agent (Grok) executing the GRIDWAKE Implementation Pack | Branch `demo-final-polish`, one commit per gate |
| Independent review (Prompt 09) | Separate review pass after gates land | Findings-first; patch only verified high/medium defects |
| Primary `/feedback` Session ID | *Placeholder — capture from the implementing thread when available* | Never invent an ID |

Primary Codex `/feedback` Session ID: `PENDING — replace with real Session ID from /feedback`

## Pre-existing vs added during Build Week

| Capability | Status at baseline (`ac10325`) | Added in this polish pass |
| --- | --- | --- |
| Solo + P2P playable slice | Present | — |
| Local Instinct compiler | Present | — |
| Deterministic 45s engine | Present (docs still said 60s) | Docs/UI aligned to `ROUND_SECONDS` |
| Quiet HUD / premium feel | Present | — |
| `@fontsource/ibm-plex-mono` | Missing (CSS named the font only) | Prompt 01 |
| Favicon + OG/Twitter meta | Partial theme-color only | Prompt 01 |
| CI `npm run verify` | Missing | Prompt 01 |
| Tactic starters / controls hint / event toast | Missing or unused | Prompt 02 (planned) |
| Procedural audio | Missing | Prompt 03 (planned) |
| Same-seed attempt comparison strip | Missing | Prompt 04 (planned) |
| Intensified phosphor juice | Partial | Prompt 05 (planned) |
| Touch possession controls | Missing | Prompt 06 if green (conditional) |
| Judge path / demo script / QA evidence | Partial README | Prompts 07–08 (planned) |

## Dated commits during submission period

Updated after each verified gate commit on `demo-final-polish`.

| Date (UTC) | Commit subject | Gate |
| --- | --- | --- |
| *(filled after commit)* | `chore: align executable truth and release checks` | Prompt 01 |

## Explicit disclosures

1. The runtime sentence compiler is **local** (`compileStrategy` / keyword matching). It does not call OpenAI or any model API during play.
2. Replay hashes are local and unsigned; the multiplayer host can cheat.
3. Round length shown to players must match `ROUND_SECONDS` (45). Do not claim 60 seconds for the current executable.
4. Build Week Session ID above remains a placeholder until a real `/feedback` ID is pasted.

## Test / deployment evidence

- Local gate command: `npm run verify` (typecheck + test + build + golden + sensitivity).
- CI workflow: `.github/workflows/verify.yml` (Node 22, Python 3.12, `npm ci`, `npm run verify`).
- Deployment: do not treat a new production alias as proven until Prompt 08 records a verified deploy SHA.
