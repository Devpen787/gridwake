# GRIDWAKE — 2-Minute Demo

**Video:** [`demo/gridwake-demo.webm`](gridwake-demo.webm) · 1:51 · 1920×1080 · recorded live against https://gridwake.vercel.app
Open it in Chrome (QuickTime can't play WebM): `open -a "Google Chrome" demo/gridwake-demo.webm`
Need an `.mp4` for the submission form? `ffmpeg -i gridwake-demo.webm -c:v libx264 -crf 20 -pix_fmt yuv420p gridwake-demo.mp4`

The video already has on-screen captions baked in, so it works silently. The voiceover below is optional — if you record it over the video, each line is timed to fit its scene at a relaxed speaking pace.

---

## Voiceover script (read this aloud)

**[0:00 – Landing page]**
This is GRIDWAKE. It's a strategy game where you don't get a controller — you get one English sentence.

**[0:08 – Campaign ladder]**
There's a campaign of eight grids. Hold a grid to unlock the next one, and beat par to earn stars.

**[0:15 – Briefing, then typing]**
Each grid briefs you, then asks for your strategy. So I just type what I want my squad to do... in plain English.

**[0:26 – Plan card appears]**
Before anything runs, a local compiler shows me the plan it built from my words.

**[0:32 – Evidence panel expands]**
It quotes the exact phrases it used — and I could command each light by name. No AI API calls. This all runs in the browser, deterministically.

**[0:37 – WAKE]**
Let's wake the squad.

**[0:40 – Round begins]**
Forty-five seconds. Corruption pours in from every edge of the grid.

**[0:47 – Ring forms]**
My sentence is the AI: hold a tight ring, send two interceptors, never chase.

**[0:54 – Possession, WASD]**
And when I want direct control, I take it — possessing a light gives me six seconds of manual override.

**[1:04 – Pressure builds]**
The round escalates through phases: probe, surge, collapse. The grid fights harder as time runs out.

**[1:11 – Reticle, then Pulse fires]**
I get exactly one Pulse. My sentence aims it — that reticle shows where it'll strike... and there it goes.

**[1:19 – Final seconds]**
Last few seconds. The ring holds.

**[1:26 – Result card]**
Every round is graded, and every outcome is traced back to the words that caused it. I beat par — so the next grid unlocks.

**[1:37 – Starred ladder]**
Everything gets archived: stars, ranks, streaks, personal bests.

**[1:44 – Closing]**
GRIDWAKE. One sentence. One light. One shared grid. Play it at gridwake dot vercel dot app.

---

## On-screen captions (already in the video — for reference)

| Time | Caption |
| --- | --- |
| 0:00 | GRIDWAKE — command a squad of three lights with one English sentence. |
| 0:08 | Eight fixed-seed grids. Hold each one to unlock the next. Beat par to earn stars. |
| 0:15 | Every grid briefs you. Then it asks for one sentence. |
| 0:19 | Write your strategy in plain English… |
| 0:26 | A local compiler turns your words into a plan — and shows what it understood. |
| 0:32 | Quoted evidence for every clause. You can command each light by name. No API calls. |
| 0:37 | Wake the squad. |
| 0:40 | 45 seconds. Corruption floods in from every edge. |
| 0:47 | Your sentence is the AI — a disciplined ring, two interceptors, no chasing. |
| 0:54 | Or seize a light yourself: six seconds of manual override. |
| 1:04 | Phases escalate: probe… surge… collapse. The grid fights back harder. |
| 1:11 | One Pulse per round. Your sentence aims it — the reticle shows where it strikes. |
| 1:19 | Hold the line. |
| 1:26 | Graded. Attributed. Par beaten — the next grid unlocks. |
| 1:37 | Every round archived — stars, ranks, streaks, personal bests. |
| 1:44 | GRIDWAKE · gridwake.vercel.app — one sentence. one light. one shared grid. |

## The one-breath pitch (if you only get 15 seconds)

GRIDWAKE is a deterministic strategy game where your controller is a sentence. A local compiler turns plain English into a squad AI, shows you exactly how it read every word, and grades the round — same seed, same words, same outcome, every time.

## Re-recording

The take is fully scripted and reproducible (same seed + same sentence ⇒ same round):

```bash
# Requires playwright resolvable from the repo (npx playwright install chromium once).
node demo/record-demo.cjs   # drives production, records 1920×1080 webm into demo/out/
```
