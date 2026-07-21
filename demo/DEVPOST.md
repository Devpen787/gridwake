# GRIDWAKE — Devpost submission copy

Paste-ready. Adjust the personal notes in **Inspiration** to your own voice before submitting.

---

## Inspiration

We talk to machines in sentences now. We still play games with buttons.

That gap is what started GRIDWAKE. I wanted a game where the *only* control surface is language — where you don't move a unit, you describe a doctrine, and then you live with it. Not a chatbot wearing a game costume, and not a game that pretends to understand you: something that reads your words, **shows you exactly what it understood**, and then executes it faithfully in front of you.

The second half of that sentence mattered more than the first. Most "AI does what you said" experiences hide the interpretation step, so when the behavior surprises you, you can't tell whether you were misunderstood or just wrong. I wanted the interpretation to be the most legible part of the game — quoted, attributed, arguable.

## What it does

You write one sentence. Something like:

> *Guard the core in a tight disciplined ring. Send two units within 25% and do not chase. Pulse below 45% health.*

GRIDWAKE compiles that into a canonical plan, shows you the plan **before** you commit, then wakes a three-light squad — Guardian, Scout, Mender — to hold a neon grid against spreading corruption for 45 seconds. You can address the whole squad or command each light by name. You can seize a light yourself for six seconds of manual override. You get exactly one Pulse, and your sentence decides where it lands.

Then it grades you, and traces the outcome back to the phrases that caused it.

There's a campaign of eight fixed-seed grids with par scores, star ratings, and sequential unlocks, plus a persistent service record — ranks, streaks, personal bests, score trend — and a peer-to-peer mode where three players each write one part of a shared instinct.

## How we built it

Codex and GPT-5.6 were the development partner for the majority of the core: shaping the game contract, implementing and debugging the deterministic engine and UI, building the bounded Instinct compiler and P2P mode, testing real browser flows, diagnosing performance failures, reviewing security boundaries, and deploying the result. I retained the key product and engineering decisions—most importantly that language interpretation must be visible before play, that live physics must remain deterministic, and that the game must never pretend a network or compiler state succeeded when it did not. The primary `/feedback` Session ID is `019f7658-6844-7f62-a335-cc58ccdee45d`. GPT-5.6 does not run inside the shipped game; its contribution is the development and verification work documented in the repository.

The core is a **bounded tactical-language compiler** (`local-instinct-v2`, ~1,760 lines of TypeScript) that runs entirely in the browser. There is no model API call at play time. The pipeline:

```
normalize → clause segmentation → phrase parsing → conflict resolution
         → validation → canonical plan → policy adapter → engine dials
```

A 332-phrase lexicon maps natural paraphrase onto a small canonical vocabulary of actors, actions, targets, formations, movement styles, engagement postures, and phase conditions. Every directive carries **provenance** — was this stated by the player, inferred by the compiler, or applied as a default? That provenance is what powers the "how it read your words" panel and the post-round attribution.

The simulation is a pure TypeScript engine at 10 Hz logical ticks with a seeded LCG, deliberately kept separate from rendering. The rule I held all the way through: **rendering never mutates simulation state.** Identical seed + compiled plan + Pulse timing + possession intents produce an identical `replayHash`, every time, on any machine.

Rendering is Pixi.js over WebGL — a layered "Phosphor Noir" arena with grid warp, corruption mass, trails, impacts, and camera impulses. Audio is procedural Web Audio. Multiplayer is Trystero over WebRTC with a host-ordered input log and checkpoint hashes.

For grading, health, threat control, and autonomy are combined into one score:

$$\text{score} = \operatorname{clamp}\!\left(0.55\,H + 0.25\,I + 0.20\,(100 - T_{\max})\right)$$

where \\( H \\) is final core health, \\( T_{\max} \\) is peak threat, and \\( I \\) is **instinct impact** — the share of corruption cleared autonomously by your written doctrine rather than by your own hands or the Pulse:

$$I = 100 \cdot \frac{c_{\text{intercept}} + c_{\text{repair}}}{c_{\text{intercept}} + c_{\text{repair}} + c_{\text{pulse}} + c_{\text{manual}}}$$

That fraction is the thesis of the game in one formula: the score rewards *writing well*, not clicking well.

Verification is a five-part gate — TypeScript typecheck, 230 Vitest tests across 17 files (105 of them a corpus of natural-language phrasings asserting compiled plans), a production build, an **independent Python 3.12 reference implementation** that must reproduce the same policy dials, and a sensitivity sweep proving the strategy actually changes outcomes.

## Challenges we ran into

**A parser bug that silently flattened plans.** Fronted conditions — *"During surge, send two units to the most urgent breach"* — were being glued onto the previous clause, collapsing a three-phase strategy into one directive, with "During surge" dumped into the UNRESOLVED list. It compiled, it ran, it scored, so nothing failed loudly. Only reading the compiled output of every shipped example caught it. Fix: a connector-led fragment that carries its own comma and body is a standalone clause.

**Screenshots lie about motion.** Lights step one cell every 200 ms, but the render interpolation finished in 150 ms — so the squad marched, froze, marched. Every still frame looked fine. The fix was continuous exponential damping toward the engine cell each frame, and moving all ambient animation off the 10 Hz tick onto wall-clock time.

**Then the real culprit turned out to be pixels.** On a 3024×1602 retina display, the canvas was rendering ~17 megapixels of vector redraw per frame and dropping to single-digit FPS. It wasn't the animation at all. Capping the backing store to roughly 5 MP fixed it. Related: every stroke width was tuned for a 1440 px window, so on a 3000 px display the entire arena rendered as hairlines and read as scratchy wireframe. Line weights now scale with cell size.

**"The squad flies over corruption and nothing happens."** True, and it was an engine gap, not a rendering one: only lights in `intercept` mode ever cleared cells, so a light crossing the mass on its way home was inert. Now any light standing on corruption burns it at the intercept cadence.

**Too much truth on screen.** The strategy lab showed evidence, defaults, clamps, unresolved words, and warnings all at once. It's an honesty feature that read as homework. Progressive disclosure fixed it: the plan a player needs by default, the compiler's full reasoning one click away.

**Determinism discipline under deadline.** Every visual and UX change had to stay out of the replay hash. The golden-vector parity check and the sensitivity sweep are what let me make aggressive changes to the renderer at 2 a.m. and still trust the physics.

## What we learned

- **Interpretation transparency is a game mechanic, not a debug view.** Showing quoted evidence per directive turned "why did it do that?" into "I phrased that badly" — which is the loop worth having.
- **Determinism buys speed.** A fixed seed plus a replay hash meant every bug was reproducible on demand and every visual change was provably safe.
- **Bounded language beats a model here.** No API call, no latency, no nondeterminism, works offline, and the vocabulary limits are legible to the player instead of mysterious.
- **Test what you claim.** The corpus tests assert *compiled plans* for natural phrasings, so adding a synonym can't quietly break an existing strategy.
- **Verify in motion, at the real resolution.** Green tests and clean screenshots said the game was fine while it was running at 3 FPS on a large display.

## What's next

Signed server-side receipts and a real leaderboard; sharper NAT traversal for peer rooms; a deeper phase-conditional grammar (nested triggers, per-role fallbacks); and a puzzle mode where you're given a target outcome and must find the sentence that produces it.

---

## Built With

```
typescript · react · pixi.js · webgl · vite · vitest · node.js · python
web-audio-api · webrtc · trystero · canvas · html5 · css3 · localstorage
vercel · git · github · playwright · ffmpeg
```

## Try it out

- **Play:** https://gridwake.vercel.app
- **Code:** https://github.com/Devpen787/gridwake
