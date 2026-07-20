# GRIDWAKE

**One sentence. One light. One shared grid.**

Play the production preview: **https://gridwake.vercel.app**

GRIDWAKE is a minimalist 45-second strategy game. Players tell a three-light
squad how to protect a neon grid; the current local interpreter converts that
sentence into a bounded Instinct, and a seeded engine makes the behavior varied
but exactly replayable.

## Current truth

This folder now contains a playable **Solo Architect vertical slice** and a
**2-3 player P2P beta** plus the
full product/operation/governance specification, executable sector-level math
reference, policies, and threat-model draft. The slice runs locally in a browser:
one tactical sentence resolves as visible formation, protected radius,
interceptor count, pursuit limit, movement character, focus, risk, and Pulse
guidance. The squad now holds formation, takes bounded intercept assignments,
returns when threats leave range, and uses seeded path variation. A deterministic
45-second grid resolves at 10 logical ticks/second, one Pulse can be spent, and
the result includes a reproducible local receipt.

The compiler is deliberately labeled `LOCAL PROTOTYPE`. Multiplayer uses a
player-hosted ordered log over encrypted WebRTC data channels with Nostr peer
discovery: no account or application database is required. Pulse is ordered by
the host and replay hashes are compared every five seconds. This is not server
authority; the host can cheat, receipts are unsigned, live reconnect is disabled,
and network metadata may be visible to peers/infrastructure. Moderation, audio,
and cross-network restrictive-NAT proof are not complete yet. The production
preview is deployed, but P2P availability still depends on the players' networks
and third-party discovery infrastructure.

The playable cell engine passes its current Instinct Runtime gate: the full
TypeScript suite plus Python golden-vector parity and sensitivity validation.
In multiplayer each player's
sentence owns their role's dials (guardian: shape/radius/movement/pulse, scout:
interceptors/pursuit/risk, mender: link focus); sentences are no longer blended. Four
reference tactics produce different paths and metrics; close defense, wide
coverage, interceptor count, and Pulse timing now have measurable trade-offs.
These fixtures prove reproducibility and sensitivity, not production balance or
fun. The separate future multiplayer sector abstraction remains too binary and
is still blocked.

## Start here

1. [Solo vertical-slice contract](specs/solo-architect-vertical-slice.md)
2. [Instinct Runtime v1 contract](specs/instinct-runtime-v1.md)
3. [Instinct Runtime math audit](docs/GRIDWAKE_INSTINCT_RUNTIME_V1_AUDIT.md)
4. [Phosphor Noir visual system](design/PHOSPHOR_NOIR.md)
5. [Multiplayer authority audit](docs/GRIDWAKE_MULTIPLAYER_AUDIT.md)
6. [Master blueprint](docs/GRIDWAKE_BLUEPRINT.md)
7. [Complete user paths](docs/GRIDWAKE_USER_PATHS.md)
8. [Formal validation](docs/GRIDWAKE_FORMAL_VALIDATION.md)
9. [Design threat model](docs/GRIDWAKE_DESIGN_THREAT_MODEL_DRAFT.md)
10. [Machine-readable product states](product-path-model.yaml)
11. [Terms draft](policies/TERMS_DRAFT.md), [privacy draft](policies/PRIVACY_DRAFT.md),
   and [community rules](policies/COMMUNITY_RULES.md)

## Run the playable slice

```bash
cd /Users/devinsonpena/Documents/Hackathons/gridwake
npm install
npm run dev
```

Then open the local URL printed by Vite. Verification commands:

```bash
npm run typecheck
npm test
npm run build
./node_modules/.bin/vite-node validation/run_sensitivity.ts
python3 -m unittest discover -s validation -p 'test_*reference.py'
```

## Run the design reference

```bash
cd /Users/devinsonpena/Documents/Hackathons/gridwake/validation
python3 gridwake_reference.py --write-artifacts --seed-count 200
python3 -m unittest -v test_gridwake_reference.py
```

## Hackathon fit

The intended track is **Apps for Your Life**. The official OpenAI Build Week
rules explicitly allow games, require Codex and GPT-5.6, a working runnable
project, a sub-three-minute public YouTube demo, a repository, clear Codex
collaboration documentation, and a `/feedback` Codex session ID. Deadline:
July 21, 2026 at 5:00 PM Pacific. Verify all details against the
[official rules](https://openai.devpost.com/rules) before submission.

The current demo proves a solo Instinct loop. GPT-5.6/Codex build provenance is
separate from runtime AI. A future ChatGPT connection or server-authoritative
room must be implemented and demonstrated before either can be claimed as a
live game capability.
