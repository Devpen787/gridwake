# Cinematic Arena — Three.js / Warp Field

**Branch:** `cinematic-three-arena`  
**Reference:** `design/reference/gameplay-north-star.png`  
**Constraint:** Deterministic engine unchanged. React HUD unchanged. Presentation only.

## Goal

People cannot look away. The battlefield must feel like a sealed phosphor instrument
with **depth, warp, and bloom** — not a flat technical diagram.

## Visual pillars

1. **Warped lattice** — grid vertices displaced by a field function (bowl + wells).
2. **Core gravity** — soft spherical depression around the light.
3. **Pulse spacetime** — Pulse injects a travelling radial warp that light trails follow.
4. **Corruption organism** — connected red crust on the rim with particle spray.
5. **Bloom / phosphor** — UnrealBloom so cyan/amber/violet/red read as living signal.
6. **Slight perspective** — camera tipped for depth without becoming a free 3D sandbox.

## Warp field (shared)

World XY is cell space mapped to plane metres. Displacement along camera-facing Z:

```
warp(p) =
  bowl(|p - core|) * bowlAmp
  + pulseWell(|p - pulse|, pulseAge) * pulseAmp
  + rimLift(rimDistance) * rimAmp
```

- Trails and role motion sample the same warp so light appears to travel through bent space.
- Reduced motion: warp amplitudes → 0; bloom strength reduced; no camera bob.

## Layer stack

`void` → `warped grid` → `corruption crust` → `trails` → `tactics` → `core` → `roles` → `impacts` → `post bloom`

## Non-goals

- No engine rule changes.
- No fake enemy AI visuals.
- No dashboard chrome.
- No external paid assets.
