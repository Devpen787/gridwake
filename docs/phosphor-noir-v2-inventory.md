# Phosphor Noir v2 — Implementation Inventory

**Branch:** `phosphor-noir-v2`  
**Baseline:** `b034def52ce0cc62e35c03e4d3fc1d0aba669782` (instinct-runtime-v2 tip)  
**Pre-flight:** `npm ci` + `npm run verify` PASS (204 TS tests)

## 1. Existing visual systems that work

- Phosphor Noir tokens / IBM Plex Mono (`design/PHOSPHOR_NOIR.md`, `global.css`)
- Pixi arena with atmosphere / world / actor layers (`PixiArena.tsx` ~799 lines)
- Corruption birth/collapse maps + rim veins (`arena-fx.ts`)
- Role-distinct glyphs (diamond / triangle / rings)
- Pulse ring + grid warp; impact flashes; possess claim ring
- Impulse camera (phase / damage / pulse) in Pixi + CSS kick secondary
- Segmented health, timer, pulse CTA, Override meter, intention line
- Strategy Lab + StrategyPreview; Awakening orbit; Result over frozen arena
- Mobile touch pad + coarse-pointer roster hide; procedural audio
- Instinct v2 plan / attribution types; reduced-motion path

## 2. Partial systems

- Corruption cohesion (per-cell gaps; veins skip 25%)
- Core presence (very low glow alphas)
- Role scale at gameplay zoom (~cell×0.28)
- Trail role language (mender amber dominates)
- Tactical fields (subtle)
- Result “battlefield remains” (card too opaque)
- Program lab density (preview max-height 320px)
- Live attribution often falls back to compiled interpretation

## 3. Screenshot-visible defects (acceptance)

1. Corruption reads as disconnected outlined boxes  
2. Amber trails dominate / retain too much history  
3. Diagonal tactical rays escape arena (no clip mask)  
4. Roles too small at gameplay zoom  
5. Silhouettes not strong enough without HUD  
6. Core too quiet vs arena scale  
7. Center feels empty vs boundary combat  
8. Override / intention typography too small  
9. Program screen underuses large viewports  
10. Result card opaque — final arena not primary memory  

## 4. Already exist — do not recreate

Corruption birth/collapse; rim veins; Probe/Surge/Collapse styling; G/S/M differentiation; procedural ambience; six-second Override UI; StrategyPreview; frozen result arena; manual/Instinct/Pulse separation.

## 5. Improve rather than replace

Corruption adjacency/body/frontier; trail age decay; arena clipping; role scale/silhouettes; core hierarchy; pressure bridges from real state; HUD selective scale; Program viewport use; Result translucency; audio buses/panning.
