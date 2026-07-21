# Phosphor Noir v2 — Visual System Spec

**Status:** Active implementation  
**Branch:** `phosphor-noir-v2`  
**Baseline:** `b034def` (Instinct Runtime v2)  
**Constraint:** Renderer-only. No engine rewrite. No React/Pixi framework replacement.

## Visual hierarchy

1. Core (value / danger)  
2. Active roles + current intention  
3. Corruption frontier + connected body  
4. Recent trails / repair network  
5. Tactical rays / leashes / pressure bridges  
6. Grid + atmosphere  
7. Historical trails (quiet)

## Layer stack (back → front)

`atmosphere` → `grid` → `corruption body` → `corruption veins` → `corruption frontier` → `trails` → `tactics` → `core` → `roles` → `impacts` → `pulse`

All world layers share one arena clip mask.

## Arena composition

- Orthographic 30×18 cell grid, centred with margins.  
- Explicit clip rect = grid bounds (+ 0.5 cell inset for stroke safety).  
- No decorative line may escape the clip unless documented as a phase veil (phase veil is atmosphere only, still clipped).

## Corruption (organism)

Per cell: N/E/S/W adjacency (+ selective diagonals for vein continuity).

1. **Body** — dark connected mass behind frontier  
2. **Veins** — fracture paths between adjacent cells  
3. **Frontier** — brighter inward-facing edge toward core  

Phases modulate frontier aggression (Probe quiet → Surge clear sector → Collapse sharp). Birth grows fracture→crust; clear collapses inward with short scar. No full-screen red bloom.

## Role silhouettes (HUD-off readable)

| Role | Form | Trail | Impact |
|------|------|-------|--------|
| Guardian | Layered diamond + shield arc + lattice | Short violet-white structural | Heavy block |
| Scout | Arrowhead + facing + reticle | Cyan dash, rapid decay | Sharp cut |
| Mender | Linked rings + tether nodes | Amber network; repair sections bright | Stitch close |

Scale: body radius ≈ `max(7, cell × 0.42)` (up from ~0.28).

## Trail language

Age-based: newest 15–25% brightest; mid history decays; oldest faint. Cap history. Directional energy flow on current move. Role rules as table above. Previous route never equals current action brightness.

## Tactical rays / causality

Derive from real state: `plan`, targets, formation anchors, `pressureBySector`, health, phase. Clip to arena. Examples: spread separation, ring compact field, highest-pressure scout emphasis, leash reversal on do-not-chase, mender shared-crossing highlight, collapse regroup contraction, aggressive acquisition language, erratic path character (no random camera).

Possessed focus shows one concise directive line (DOM).

## Core

Layered structure, inner white mark, cyan influence field, health contraction, directional lean toward pressure sector, phase tension, damage fracture persistence, Pulse charge/discharge. Focal without occluding cells.

## Phase escalation

Probe spacious/cool; Surge pressure sector clear + stronger tactics; Collapse core contracts + sharp frontier + urgent audio. Transitions 700–1100ms: world label, one camera impulse, one audio cue; no pause/modal.

## Impact signatures

Intercept cyan cut; repair amber stitch; manual white+role cut; core damage fracture + grid buckle + low camera impulse. DOM toast only for phase / core damage / warning / Pulse / result.

## Camera limits

Damage 120–180ms, 3–5px toward pressure; Pulse 1.0→1.02→1.0; phase subtle focus; possess short claim. Reduced motion: no translate/scale. Prefer scene camera over CSS shake when covered.

## Audio

Separate ambience + effects buses; positional pan when possible; phase/threat colouring; Pulse ducks ambience; clean result resolve; mute authoritative; no new deps.

## Program composition

Desktop: large workspace + large preview as one instrument; WAKE attached to workspace; compact interpretation; phrase/role hover illuminates preview. No SaaS inspector.

## Result composition

Darkened battlefield primary; translucent layered card; final roles/frontier/core damage/Pulse scar visible; keep grade/stats/comparison/recommendation + expandable causal trace.

## Mobile

Hide desktop roster; touch selector + hold-to-repeat; Pulse reachable; safe-areas; no overlap among audio/phase/hint/pad.

## Reduced motion

Crossfades only; no camera translate/scale; no warp; simplified corruption animation; Awakening skippable crossfade.

## Performance budgets

Cap trails, corruption ghosts, afterimages, particles. No unbounded maps. No Pixi Application leaks. No AudioNode leaks. No full scene rebuild per tick. Simplify on mobile / high DPR. Dev `?perf=1`: FPS, transient count, particles, size, DPR.

## Screenshot acceptance states

Landing; Edge Hunter workspace; tight-ring workspace; Probe; Surge; Collapse; Guardian defense; Scout acquisition; Mender repair; possessed; core damage; Pulse; held/lost result; 390×844; reduced motion.

Hard gates: connected corruption; clipped rays; quiet old trails; readable roles; focal core; center↔edge bridges; readable Override; visible result arena; Program uses viewport; no overflow; no mobile overlap.
