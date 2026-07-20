# GRIDWAKE

**One sentence. One light. One shared grid.**

## Play the demo

Production preview: **https://gridwake.vercel.app**

GRIDWAKE is a deterministic **45-second** strategy game. Write one sentence, wake a three-light squad, and hold a neon grid. A local keyword compiler turns the sentence into bounded Instinct dials; a seeded engine makes the round varied but exactly replayable.

## 60-second judge path

This is the time needed to evaluate the demo, not the round duration.

```text
Open preview → SOLO → choose RING KEEPER → WAKE → press 1 and move → press Esc → use Space when Pulse says FIRE → inspect grade → TUNE SAME GRID.
```

Expected signals: tactic starters, first-run controls hint, live event toast, procedural audio (after a click), grade-first result, and a `VS LAST ATTEMPT` strip after the second same-seed round.

## What the player does

1. Pick Solo (or Create/Join a P2P room).
2. Write a freeform Instinct or tap a tactic starter (Ring Keeper, Edge Hunter, Chain Repair, Ten Percent Ring).
3. Watch the 45-second round: formation, intercepts, trail repair, one Pulse.
4. Optionally possess a light (`1`–`3` / touch selectors), step with WASD or the pad, release with Esc / re-tap.
5. Read the grade and receipt; Tune Same Grid to compare attempts on the same seed.

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

Build Week rules require Codex + GPT-5.6 for the judged core. This polish pass was executed in Cursor against the GRIDWAKE Implementation Pack (Prompts 01–08). Primary `/feedback` Session ID: see `docs/BUILD_WEEK_EXTENSION.md` (placeholder until a real Codex `/feedback` ID is pasted — never fabricated).

**Runtime:** the sentence compiler is still a **local** keyword matcher. There is no OpenAI API call during play.

## Architecture

- **Engine:** pure TypeScript, 10 Hz logical ticks, seeded LCG/hash helpers, replay hash over simulation state.
- **UI:** React product flow + accessible DOM HUD.
- **Render:** Pixi.js arena (interpolation, trails, corruption, Pulse warp, sparks) — render-only; does not mutate engine state.
- **Audio:** procedural Web Audio cues; mute preference in `localStorage`; unlock after first gesture.
- **Multiplayer:** Trystero P2P host-ordered log; checkpoint hashes; not server-authoritative.

## Determinism and replay

Identical seed + compiled strategy + Pulse timing + possession/manual intents ⇒ identical `replayHash`. Polish (font, audio, sparks overlay, HUD) does not enter the hash. Same-seed rematch keeps the seed and shows score / core / instinct deltas versus the prior attempt.

## P2P beta truth / limitations

- Host-ordered input; host can cheat.
- Receipts are local and unsigned.
- Live mid-round reconnect is disabled.
- Restrictive-NAT / custom TURN is **not** proven.
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

## Known limitations

- No runtime model compiler; local matcher only.
- No signed/server receipts or leaderboards.
- Cross-network restrictive-NAT failure path unproven.
- Balance is provisional; fixtures prove reproducibility, not “fun.”
- Demo video / screenshot assets may still be pending under `demo/` and `docs/BUILD_WEEK_EXTENSION.md`.

## Specs and deeper docs

1. [Solo vertical-slice contract](specs/solo-architect-vertical-slice.md)
2. [Instinct Runtime v1](specs/instinct-runtime-v1.md)
3. [Phosphor Noir](design/PHOSPHOR_NOIR.md)
4. [Multiplayer authority audit](docs/GRIDWAKE_MULTIPLAYER_AUDIT.md)
5. [Build Week extension record](docs/BUILD_WEEK_EXTENSION.md)
6. [Demo script](demo/demo-script.md)
7. [Release QA checklist](docs/RELEASE_QA.md)
8. [Policies](policies/TERMS_DRAFT.md)
