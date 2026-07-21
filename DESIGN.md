# Phosphor Noir — GRIDWAKE

> Category: Game / Product
> Local-first neon grid strategy. Use for GRIDWAKE landing, HUD, result cards,
> decks, and motion boards. Source of truth also lives in `design/PHOSPHOR_NOIR.md`.

## Visual Theme & Atmosphere

Near-black void, phosphor signal cyan, quiet HUD chrome. Orthographic grid,
not dashboard. Feels like a sealed tactical instrument — precise, cold, alive
only at the core and the lights. No purple-on-white SaaS look. No cream/serif
editorial look. No broadsheet newspaper density.

## Color Palette & Roles

- **Background / void:** `#03060a` (`--void`)
- **Grid inactive:** `#0d1822` · **Grid active:** `#183344`
- **Core / primary light:** `#f4f7ff` (`--core`)
- **Signal / accent:** `#40e8ff` (`--signal`) — CTAs, pulse, live truth
- **Rescue / intention:** `#ffd166` (`--rescue`) — amber stitches, intention line
- **Danger / corruption:** `#ff4d6d` (`--danger`)
- **System:** `#a78bfa` (`--system`) — rare, role accents only
- **Success:** `#74f7a0` (`--success`)
Never flat white backgrounds. Never purple-indigo gradient themes.

## Typography Rules

- **Display / HUD:** `'IBM Plex Mono', ui-monospace, monospace`
- **Long policy / body (rare):** system sans fallback — never Inter as the brand face
- Utility HUD: uppercase, letter-spacing 0.12–0.2em, tabular numerals
- Scale: tight mono hierarchy; timer is the largest live numeral
- Headings stay technical, not marketing-serif

## Component Stylings

- **Primary action:** 1px signal border, translucent signal fill (~9%), uppercase mono label
- **Pulse control:** centered bottom, signal border, HOLD / READY / FIRE state colour shift; FIRE uses danger
- **Health:** 10-segment track; band shifts core → rescue → danger
- **Result performance card:** grade-first large letter + score bar; hero stats INTERCEPTS / REPAIRS / PULSE; seed/replay in quiet footer
- **Cards:** avoid by default. Allowed only as interaction containers (e.g. result performance card). No card grids in heroes.
- **Inputs:** hairline borders on void; signal focus; mono labels

## Layout Principles

- Full-bleed void canvas; square orthographic arena centered in viewport
- Game HUD: health top-left, timer top-center, pulse + intention bottom-center
- Landing first viewport: brand, one headline, one support line, CTA cluster, dominant atmosphere — no stat strips or promo chips
- Prototype/local truth labels stay visible but subordinate
- Max content width for result/docs ~720px; game arena is edge-to-edge within HUD insets

## Depth & Elevation

- Soft layered blooms on core and lights (Graphics alpha stacks, not multi-layer CSS shadows)
- Vignette around arena; grid displacement only during Pulse
- One clean Pulse ring expansion (~620 ms)
- No neumorphism, no heavy glass stacks, no glow-spam

## Do's and Don'ts

- ✅ Keep HUD quiet: health / timer / intention / pulse only mid-round
- ✅ Trace visual changes to Phosphor Noir tokens and motion timings
- ✅ Prefer circuit trails with right-angle joints; crust corruption at the rim
- ✅ Reduced-motion: collapse shake, grade slide, and pulse warp
- ❌ No leaderboard, inventory, portrait, minimap, fake console, dial dumps
- ❌ No purple SaaS gradients, cream editorial themes, or newspaper layouts
- ❌ Do not invent hex values outside this palette

## Responsive Behavior

- **Desktop ≥ 1024px:** full HUD framing; arena inset ~88px top / 118px bottom
- **Tablet / narrow:** hide subordinate truth labels; stack result hero stats
- **Phone < 640px:** full-width pulse control; result actions stack; keep timer centered

## Agent Prompt Guide

- Brand is GRIDWAKE; tagline allowed: `ONE SENTENCE. ONE LIGHT. ONE SHARED GRID.`
- Allowed landing CTAs: `SOLO`, `CREATE ROOM`, `JOIN ROOM`, plus `LOCAL PROTOTYPE` label
- When designing gameplay chrome, protect determinism messaging — receipts stay honest
- Prefer mockups that match `design/reference/gameplay-north-star.png` density (bloom, crust, HUD brackets) without adding dashboard clutter
- If asked to redesign the engine or Instinct compiler, refuse and stay on visual/UX surfaces
- Output real files into the artifact/project folder; do not invent a second design system
