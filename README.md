# GRIDWAKE

**One sentence. One light. One shared grid.**

## Play the demo

Production preview: **https://gridwake.vercel.app**

**1:48 submission demo** (captioned, narrated, recorded against production): [`demo/gridwake-demo-submission.mp4`](demo/gridwake-demo-submission.mp4) · script + voiceover lines: [`demo/DEMO_SCRIPT.md`](demo/DEMO_SCRIPT.md)

GRIDWAKE is a deterministic **45-second** strategy game. Write one sentence, wake a three-light squad, and hold a neon grid. A bounded tactical-language compiler (`local-instinct-v2`) turns prose into a canonical plan, shows what it understood, and lowers to engine dials; a seeded engine makes the round varied but exactly replayable.

**Game systems:** an eight-grid **campaign ladder** (fixed seeds, escalating 45→60s rounds, par scores, 3-star ratings, sequential unlocks), a persistent **service record** (score history, personal bests, hold streaks, operator ranks from DRIFTER to GRIDMASTER — all local, no server), and a **tiered strategy library** (starter → expert example sentences, including phase-conditional and multi-role directives).

## 60-second judge path

This is the time needed to evaluate the demo, not the round duration.

```text
Open preview → CAMPAIGN → FIRST LIGHT → choose RING KEEPER → WAKE → press 1 and move → press Esc → use Space when Pulse says FIRE → inspect grade + par verdict → NEXT GRID.
```

Expected signals: example strategies, strategy laboratory preview, first-run controls hint, live event toast, procedural audio (after a click), grade-first result with words→round attribution, and a `VS LAST ATTEMPT` strip after the second same-seed round.

## What the player does

1. Pick Campaign (eight named grids with pars and stars), Free Grid, or Create/Join a P2P room.
2. Write a freeform Instinct or tap a tiered example strategy (starter: Ring Keeper, Edge Hunter · advanced: Chain Repair, Ten Percent Ring, Divided Watch · expert: Counterpunch, Phase Warden, Last Stand).
3. Watch the round (45s free play, up to 60s on late campaign grids): formation, intercepts, trail repair, one Pulse.
4. Optionally possess a light (`1`–`3` / touch selectors) for up to six seconds of OVERRIDE energy, step with WASD or the pad (clears only the cell underfoot), release with Esc / re-tap to preserve remaining budget.
5. Read the grade, par verdict, and receipt; Tune Same Grid to compare attempts on the same seed; advance the ladder with NEXT GRID.
6. Track everything in the Service Record: score history, sparkline trend, personal bests, streaks, and operator rank.

## What changed during OpenAI Build Week

Branch `demo-final-polish` adds judge-trust and demo polish on top of the playable solo + P2P slice:

| Gate | Commit subject |
| --- | --- |
| Prompt 01 | `chore: align executable truth and release checks` |
| Prompt 02 | `feat: teach tactics and surface live events` |
| Prompt 03 | `feat: add procedural game audio` |
| Prompt 04 | `feat: compare same-seed attempts` |
| Prompt 05 | `feat: intensify phosphor arena feedback` |
| Prompt 06 | `feat: add touch possession controls` |
| Prompt 07 | `docs: prepare judge path and build evidence` |

Evidence and dated SHAs: [`docs/BUILD_WEEK_EXTENSION.md`](docs/BUILD_WEEK_EXTENSION.md).

## How Codex and GPT-5.6 were used

GRIDWAKE's core functionality was built collaboratively with Codex and GPT-5.6 during Build Week: product definition, the deterministic engine, the first playable UI, the bounded Instinct compiler, P2P multiplayer, replay checks, security review, testing, and production deployment. I made the product calls—especially keeping the live runtime deterministic and local, making every interpretation visible before play, and treating unsupported multiplayer states as explicit failures rather than hiding them. Codex accelerated implementation, browser playtesting, performance diagnosis, formal verification, adversarial review, and the build-test-fix loop. A later implementation-pack polish pass was executed in Cursor and is disclosed separately in the dated extension record.

Primary Codex `/feedback` Session ID (the thread where the majority of core functionality was built): `019f7658-6844-7f62-a335-cc58ccdee45d`.

**Runtime:** the sentence compiler is a **local** bounded tactical-language pipeline (`src/game/instinct/`, label `local-instinct-v2`). There is no OpenAI API call during play.

## Architecture

- **Engine:** pure TypeScript, 10 Hz logical ticks, seeded LCG/hash helpers, replay hash over simulation state.
- **UI:** React product flow + accessible DOM HUD.
- **Render:** Pixi.js Phosphor Noir arena (interpolation, trails, corruption, Pulse, sparks) — render-only; does not mutate engine state. Experimental Three.js warp path lives under `src/render/cinematic/` (not wired by default).
- **Audio:** procedural Web Audio cues; mute preference in `localStorage`; unlock after first gesture.
- **Multiplayer:** Trystero P2P host-ordered log; checkpoint hashes; direct-first WebRTC with short-lived Cloudflare TURN credentials from a server-only Vercel Function; not server-authoritative.

## Determinism and replay

Identical seed + compiled strategy + Pulse timing + possession/manual intents ⇒ identical `replayHash`. Polish (font, audio, sparks overlay, HUD, phase visuals) does not enter the hash. Same-seed rematch keeps the seed and shows score / core / instinct / override deltas versus the prior attempt. Manual clears are scored as OVERRIDE, never as Instinct impact.

## P2P beta truth / limitations

- Host-ordered input; host can cheat.
- Receipts are local and unsigned.
- Live mid-round reconnect is disabled.
- Cloudflare TURN credentials are short-lived and the long-term key remains server-side. If the broker fails, the UI says `P2P DIRECT` and attempts the direct/STUN path.
- A forced-relay candidate check proves TURN reachability, but a complete multi-device restrictive-NAT round is **not** yet proven.
- Solo possession is disabled in rooms; Pulse is host-scheduled.

## Run and verify locally

```bash
npm ci
npm run dev
```

Full gate (typecheck, tests, build, Python golden parity, sensitivity):

```bash
npm run verify
```

Requires Node 22+ and Python 3.12 (`python3.12` on PATH for golden validation).

P2P relay support also requires server-only `TURN_KEY_ID` and `TURN_KEY_SECRET` environment variables. Never expose either value through a `VITE_` variable or commit them to the repository.

## Known limitations

- No runtime model compiler; local instinct-v2 tactical language only.
- Score history, campaign progress, and ranks are per-device (localStorage); no signed/server receipts or global leaderboards.
- End-to-end multi-device play across a restrictive NAT remains unproven; the credential broker and forced-relay configuration are covered separately.
- Balance is provisional; fixtures prove reproducibility, not “fun.”
- The narrated submission demo is checked in at `demo/gridwake-demo-submission.mp4`; upload this exact file publicly to YouTube and supply that URL in the Devpost submission form.

## Specs and deeper docs

1. [Solo vertical-slice contract](specs/solo-architect-vertical-slice.md)
2. [Instinct Runtime v2](specs/instinct-runtime-v2.md) (active; supersedes v1 keyword matcher)
3. [Phosphor Noir](design/PHOSPHOR_NOIR.md)
4. [Multiplayer authority audit](docs/GRIDWAKE_MULTIPLAYER_AUDIT.md)
5. [Build Week extension record](docs/BUILD_WEEK_EXTENSION.md)
6. [Demo script](demo/demo-script.md)
7. [Release QA checklist](docs/RELEASE_QA.md)
8. [Policies](policies/TERMS_DRAFT.md)
