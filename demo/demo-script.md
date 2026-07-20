# GRIDWAKE public demo script — target 2:30–2:50

Keep the final video under three minutes. Record against the verified production URL after the `demo-final-polish` deploy. Use game audio plus voiceover only.

## 0:00–0:15 — Hook

**Visual:** Landing screen, then cursor selects Solo.

**Voiceover:**

> GRIDWAKE is a deterministic strategy game where one sentence becomes the instinct of a three-light squad. You do not micromanage a build order. You describe the behavior you want, then watch that behavior survive—or fail—on a reproducible grid.

## 0:15–0:42 — Sentence to tactic

**Visual:** Program screen. Select Ring Keeper, then modify one phrase. Let the compact interpretation summary update.

**Voiceover:**

> I can start from a tactic or write freely. This sentence asks for a tight disciplined ring, two interceptors, no chase, and a low-health Pulse threshold. The local bounded compiler turns those words into deterministic policy dials. It does not call a runtime model, so every player gets the same behavior from the same sentence.

Press `WAKE`.

## 0:42–1:25 — Live round

**Visual:** Awakening collapses into arena. Show controls hint. Press `1`, move with WASD, press Escape. Let an intercept and repair occur. Fire Pulse when guidance says READY or FIRE.

**Voiceover:**

> The simulation runs at ten logical ticks per second, while Pixi interpolates the visuals. The squad holds formation, takes legal intercepts, stitches shared trails, and returns according to the sentence. I can briefly possess any light with one, two, or three, but manual movement uses the same movement budget and is included in the replay hash. I get one Pulse, so timing matters.

Let the audio and event feedback breathe for a few seconds.

## 1:25–1:55 — Result and same-seed proof

**Visual:** Grade/result card. Click `TUNE SAME GRID`, change one sentence phrase, show the second result’s `VS LAST ATTEMPT` strip.

**Voiceover:**

> Every round produces a local receipt with the seed, policy hash, and replay hash. Tuning the same grid holds the seed constant, then shows how this attempt changed in score, core health, and autonomous instinct impact. It is a compact cause-and-effect loop rather than a random high-score chase.

## 1:55–2:25 — Technical implementation

**Visual:** Brief architecture diagram or repository files, then return to the game.

**Voiceover:**

> The engine is pure TypeScript and deterministic. React owns the product flow and accessible DOM HUD. Pixi owns rendering, interpolation, trails, corruption, Pulse displacement, and impact effects. Multiplayer is a player-hosted P2P beta with ordered input and checkpoint hashes; it is not server-authoritative, and the interface says so.

## 2:25–2:48 — Build Week evidence

**Visual:** Commit history on `demo-final-polish` and `docs/BUILD_WEEK_EXTENSION.md`.

**Voiceover:**

> During Build Week, the Implementation Pack gates landed as dated commits: truth alignment, tactic teaching and live events, procedural audio, same-seed comparison, phosphor arena feedback, and touch possession. Tool roles and the primary feedback Session ID are documented in the repository. The runtime compiler remains local—not a live model API.

## 2:48–2:58 — Close

**Visual:** High-tension arena or Pulse, then logo.

**Voiceover:**

> One sentence. Three lights. One shared grid. This is GRIDWAKE.

## Recording guardrails

- Use a clean production URL.
- Record 1080p, 16:9.
- Keep browser notifications and personal tabs out of frame.
- Use game audio plus voiceover; avoid unlicensed background music.
- Do not say “AI-powered runtime” unless a runtime AI path actually exists.
- Do not claim server authority, signed receipts, or proven restrictive-NAT support.
- Show a real full journey, not only edited mockups.
