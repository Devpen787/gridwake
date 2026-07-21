# GRIDWAKE — 2-Minute Demo

**Video:** [`demo/gridwake-demo.mp4`](gridwake-demo.mp4) — 1:48 · 1920×1080 · H.264 + AAC voiceover · 12 MB · recorded live against https://gridwake.vercel.app
**This is the file to upload.** It has narration audio and matching on-screen captions.
Silent source recording: [`demo/gridwake-demo.webm`](gridwake-demo.webm) — VP8, plays in Chrome.

The narration below is the script that was recorded; it is muxed into the mp4 and loudness-normalized to −16 LUFS for YouTube.

---

## Voiceover script

**[0:00 — Landing page]**
Every game hands you buttons. This one hands you words.

**[0:08 — Campaign ladder]**
Eight grids stand between you and the end. Every one of them is fixed — same board for every player, every time. Hold a grid and the next one opens.

**[0:15 — Briefing appears]**
The grid tells you what's coming. Your job is to tell your squad how to survive it.

**[0:19 — Typing, live]**
So you just... write it down. Guard the core. Send two. Don't chase.

**[0:26 — Plan card fills in]**
And before anything moves — it shows you what it heard.

**[0:32 — Evidence panel]**
Every word, accounted for. Nothing hidden, nothing random, nothing phoned home.

**[0:37 — WAKE]**
Then you wake them.

**[0:40 — Round begins]**
Forty-five seconds. The corruption doesn't wait.

**[0:47 — The ring forms]**
Now your words are out there fighting for you. A tight ring. Two hunters. Nobody chases.

**[0:54 — Possession]**
And when it gets personal — you step in yourself. Six seconds at a time.

**[1:04 — Pressure builds]**
It gets worse. It always gets worse.

**[1:11 — Reticle, Pulse fires]**
You get one Pulse. One. Your words already chose where it lands.

**[1:19 — Final seconds]**
Hold on...

**[1:26 — Result card]**
And when the dust settles, every choice you wrote gets graded. Beat par... and the next grid opens.

**[1:37 — Starred ladder]**
Your story stacks up — stars, streaks, ranks, personal bests.

**[1:44 — Closing]**
GRIDWAKE. Say what you mean. Watch it fight.

---

## On-screen captions (baked into the video — for reference)

| Time | Caption |
| --- | --- |
| 0:00 | Every game gives you buttons. This one gives you words. |
| 0:08 | Eight grids. Fixed seeds. Hold one to unlock the next — beat par for stars. |
| 0:15 | The grid tells you what's coming. You tell your squad how to survive it. |
| 0:19 | Just write it down… |
| 0:26 | Before anything moves, it shows you what it heard. |
| 0:32 | Every word accounted for. Nothing hidden. Nothing phoned home. |
| 0:37 | Wake them. |
| 0:40 | 45 seconds. The corruption doesn't wait. |
| 0:47 | Your words are out there fighting — a tight ring, two hunters, nobody chases. |
| 0:54 | When it gets personal, step in yourself. Six seconds at a time. |
| 1:04 | It gets worse. It always gets worse. |
| 1:11 | One Pulse. Your words already chose where it lands. |
| 1:19 | Hold on. |
| 1:26 | When the dust settles, every choice you wrote gets graded. |
| 1:37 | Your story stacks up — stars, streaks, ranks, personal bests. |
| 1:44 | GRIDWAKE — say what you mean. Watch it fight. · gridwake.vercel.app |

## The one-breath pitch (if you only get 15 seconds)

GRIDWAKE is a strategy game where your controller is a sentence. Write what you want your squad to do, watch a local compiler turn it into behavior — with every word accounted for — and get graded on how it went. Same seed, same words, same outcome, every time.

## Re-recording

The take is fully scripted and reproducible (same seed + same words ⇒ same round):

```bash
# Requires playwright resolvable from the repo (npx playwright install chromium once).
node demo/record-demo.cjs   # drives production, records 1920×1080 webm into demo/out/
```
