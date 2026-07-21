# GRIDWAKE — 2-Minute Demo Script

**Video:** [`demo/gridwake-demo.webm`](gridwake-demo.webm) · 1:51 · 1920×1080 · recorded live against https://gridwake.vercel.app
Captions are baked into the frame (bottom bar), synced to the action. The table below doubles as a voiceover script — read each line as its scene starts.

> Need an `.mp4`? `ffmpeg -i gridwake-demo.webm -c:v libx264 -crf 20 -pix_fmt yuv420p gridwake-demo.mp4`

| Time | Scene (on screen) | Caption / voiceover line |
| --- | --- | --- |
| 0:00 | Landing page, title glow | **GRIDWAKE — command a squad of three lights with one English sentence.** |
| 0:08 | Campaign ladder, eight grid cards | Eight fixed-seed grids. Hold each one to unlock the next. Beat par to earn stars. |
| 0:15 | FIRST LIGHT briefing opens | Every grid briefs you. Then it asks for one sentence. |
| 0:19 | Sentence typed live, character by character | Write your strategy in plain English… |
| 0:26 | "YOUR SQUAD WILL" plan card fills in | A local compiler turns your words into a plan — and shows what it understood. |
| 0:32 | "HOW IT READ YOUR WORDS" expands: quoted evidence | Quoted evidence for every clause. You can command each light by name. No API calls. |
| 0:37 | WAKE → awakening flash | Wake the squad. |
| 0:40 | Round begins, corruption crawls in from the rim | 45 seconds. Corruption floods in from every edge. |
| 0:47 | Ring forms, interceptors engage | Your sentence is the AI — a disciplined ring, two interceptors, no chasing. |
| 0:54 | Press 2 → possess the scout, WASD steps, override meter drains | Or seize a light yourself: six seconds of manual override. |
| 1:04 | Phase shift, pressure builds | Phases escalate: probe… surge… collapse. The grid fights back harder. |
| 1:11 | Rotating reticle marks the strike zone; SPACE fires the Pulse | One Pulse per round. Your sentence aims it — the reticle shows where it strikes. |
| 1:19 | Final seconds, squad holds the ring | Hold the line. |
| 1:26 | Result card: grade A · 84, stats, PAR BEATEN +29 ◆◆◇, NEXT GRID highlighted | Graded. Attributed. Par beaten — the next grid unlocks. |
| 1:37 | Grid ladder with stars earned, TWIN FRONT unlocked | Every round archived — stars, ranks, streaks, personal bests. |
| 1:44 | Ladder hold, closing card | **GRIDWAKE · gridwake.vercel.app — one sentence. one light. one shared grid.** |

## The one-breath pitch (if you only get 15 seconds)

GRIDWAKE is a deterministic strategy game where your controller is a sentence. A bounded local compiler turns plain English into a squad AI, shows you exactly how it read every word, and grades the round — same seed, same words, same outcome, every time.

## Judge-facing beats the demo hits

1. **Natural-language → behavior, transparently** — typed sentence, compiled plan, quoted evidence, no API calls.
2. **Real game loop** — campaign ladder, pars, stars, unlocks, grades, personal bests.
3. **Agency layers** — autonomous squad, per-role commands, manual override, aimed Pulse.
4. **Determinism** — fixed seeds and replay hashes; the demo is reproducible by anyone.

## Re-recording

The take is fully scripted and reproducible (same seed + same sentence ⇒ same round):

```bash
node scratchpad/demo.cjs   # see session scratchpad; drives production and records 1920×1080 webm
```
