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
| Judged-core implementation (Prompts 01–08) | Cursor agent executing the GRIDWAKE Implementation Pack on branch `demo-final-polish` | One commit per gate; `npm run verify` per gate |
| Pack / prompts source | `GRIDWAKE_IMPLEMENTATION_PACK.md` | Scaffolded audio, HUD, comparison, CI, docs |
| Primary `/feedback` Session ID | *Placeholder* | Paste a real Codex `/feedback` ID when available — **never invent** |

Primary Codex `/feedback` Session ID: `PENDING — replace with real Session ID from /feedback`

Disclosure: this polish pass was implemented in Cursor rather than a separate Codex CLI session. If submission requires a Codex Session ID, generate one via Codex `/feedback` on this branch and replace the placeholder above before final submit.

## Pre-existing vs added during Build Week

| Capability | Status at baseline (`ac10325`) | Added in this polish pass |
| --- | --- | --- |
| Solo + P2P playable slice | Present | — |
| Local Instinct compiler | Present | — |
| Deterministic 45s engine | Present (docs still said 60s) | Docs/UI aligned to `ROUND_SECONDS` |
| Quiet HUD / premium feel | Present | Intensified sparks, fractures, phosphor overlay |
| `@fontsource/ibm-plex-mono` | Missing (CSS named the font only) | Prompt 01 |
| Favicon + OG/Twitter meta | Partial theme-color only | Prompt 01 |
| CI `npm run verify` | Missing | Prompt 01 |
| Tactic starters / controls hint / event toast | Missing or unused | Prompt 02 |
| Procedural audio | Missing | Prompt 03 |
| Same-seed attempt comparison strip | Missing | Prompt 04 |
| Touch possession controls | Missing | Prompt 06 |
| Judge path / demo script / QA evidence | Partial README | Prompt 07 |

## Dated commits during submission period

| Commit | Subject | Gate |
| --- | --- | --- |
| `0ef2239` | `chore: align executable truth and release checks` | Prompt 01 |
| `c2a99be` | `feat: teach tactics and surface live events` | Prompt 02 |
| `4f89ab1` | `feat: add procedural game audio` | Prompt 03 |
| `11f252c` | `feat: compare same-seed attempts` | Prompt 04 |
| `60d2cfa` | `feat: intensify phosphor arena feedback` | Prompt 05 |
| `dfb5ea6` | `feat: add touch possession controls` | Prompt 06 |
| `2f6c1f0` | `docs: prepare judge path and build evidence` | Prompt 07 |

## Decision log

1. Keep executable round length at **45 seconds**; fix docs that claimed 60.
2. No Phaser, runtime LLM, backend, TURN rewrite, or dial dashboards.
3. Audio is procedural Web Audio only — no asset packs.
4. Same-seed comparison labels “attempt,” not strategy-only causality.
5. Touch controls only after Prompts 01–05 verified green.
6. Session ID left as `PENDING` rather than fabricating eligibility evidence.

## Explicit disclosures

1. The runtime sentence compiler is **local**. It does not call OpenAI during play.
2. Replay hashes are local and unsigned; the multiplayer host can cheat.
3. Round length shown to players matches `ROUND_SECONDS` (45).
4. Build Week Session ID above remains a placeholder until a real `/feedback` ID is pasted.

## Test / deployment evidence

- Local gate: `npm run verify` (typecheck + test + build + golden + sensitivity).
- Tests at Prompt 06 tip: **96** TypeScript tests passing.
- Replay-hash spot check (seed 42, default strategy): `3dc576c7` unchanged by Prompt 05 render polish.
- CI workflow: `.github/workflows/verify.yml` (Node 22, Python 3.12, `npm ci`, `npm run verify`).
- Demo script: [`demo/demo-script.md`](../demo/demo-script.md)
- QA checklist: [`docs/RELEASE_QA.md`](RELEASE_QA.md)
- Screenshots: *pending capture into `demo/screenshots/` after production deploy*
- Deployment commit (pre–Prompt 08 alias): tip of `demo-final-polish` at docs gate `2f6c1f0`
- Vercel production deploy: `dpl_3QSRiouEqBWTcMUVnpJK26TKXcaf`
- Aliased URL: https://gridwake.vercel.app
- Inspect: https://vercel.com/devinsons-projects-b5ab981e/gridwake/3QSRiouEqBWTcMUVnpJK26TKXcaf
- Final polish SHA after Prompt 08: *(updated in same commit)*
