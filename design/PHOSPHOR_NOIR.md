# GRIDWAKE Visual System — Phosphor Noir

Reference: `design/reference/gameplay-north-star.png`

## Tokens

```css
--void: #03060a;
--grid-inactive: #0d1822;
--grid-active: #183344;
--core: #f4f7ff;
--signal: #40e8ff;
--rescue: #ffd166;
--danger: #ff4d6d;
--system: #a78bfa;
--success: #74f7a0;
```

## Typography

- Content/display: `IBM Plex Mono`, system monospace fallback.
- Utility/HUD: uppercase, 0.12–0.2em tracking, tabular numerals.
- Long policy text uses a readable system sans fallback.

## Geometry

- Near-black full-bleed canvas; no dashboard card grid.
- Square orthographic cell grid centered in the viewport.
- Lights combine hue, outline shape, and trail pattern.
- Corruption breaks alignment at the boundary rather than covering everything
  with red glow.
- Repair is an amber stitch across exact cells.
- Pulse is one clean circle with a short-lived grid displacement.

## Motion

- Logical state: 10 Hz.
- Visual interpolation: requestAnimationFrame.
- Movement: crisp cell-to-cell easing, 120–180 ms.
- Pulse: 620 ms expansion (~12 ticks at 10 Hz) with short-lived grid displacement
  (peak warp ~180 ms into the ring; decays with the pulse alpha).
- Possess claim: 280 ms white ring flash on takeover (render-only).
- Arena kick: 160 ms CSS translate shake on damage or pulse fire.
- Result grade enter: 420 ms fade/slide; score bar fills in 520 ms.
- Awakening: 900–1400 ms; reduced-motion collapses all of the above to crossfades /
  static layout (no shake, no grade slide, pulse warp amplitude 0).

## Chrome

- Top left: segmented core health (10 segments) with band colour shift.
- Top center: timer.
- Bottom center: pulse and current intention (possess cue replaces intention label).
- Result: grade-first performance card; seed/replay/status in a quiet footer.
- Prototype/local truth remains visible but visually subordinate.
- No leaderboard, inventory, portrait, minimap, fake console, or filler metrics.

## Allowed first-viewport copy

- `GRIDWAKE`
- `ONE SENTENCE. ONE LIGHT. ONE SHARED GRID.`
- `SOLO`
- `CREATE ROOM`
- `JOIN ROOM`
- `LOCAL PROTOTYPE`

