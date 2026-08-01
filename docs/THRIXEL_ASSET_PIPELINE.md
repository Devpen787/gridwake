# Thrixel asset pipeline

Thrixel is a build-time authoring service for GRIDWAKE. It never runs in the player runtime and its API key must never enter the Vite client bundle.

## Safety and licensing

- Store the key only as `THRIXEL_API_KEY` in an ignored `.env.local` file. Never use a `VITE_` prefix.
- The free-plan output license is CC BY 4.0. When a Thrixel asset is present, the runtime manifest carries the required attribution and the game Credits surface displays it.
- Free-plan prompts and generated objects may be used by Thrixel to improve or market its service. Prompts in `assets/thrixel/source-manifest.json` therefore contain generic art direction only—no private source, player data, credentials, or unreleased business material.
- Thrixel is a beta. Downloaded GLBs are retained in `public/assets/gridwake/`; the game never depends on a live Thrixel URL.

## Generate the pilot

1. Create a free Thrixel API key under **Profile → API Keys**.
2. Copy `.env.example` to `.env.local` and add the key locally.
3. Run:

```bash
npm run assets:thrixel
```

The pilot generates the modular tunnel rib and Guardian. Generation uses the public SSE progress stream, downloads the completed GLBs, checks the GLB v2 header and byte budget, and updates `public/assets/gridwake/manifest.json` atomically.

After the pilot is visually approved:

```bash
npm run assets:thrixel:all
npm run assets:validate
```

## Runtime contract

- Shipping format: GLB 2.0.
- Stable origin: centered, Y-up, forward toward negative Z.
- Per-asset byte budget: 1.8–2.5 MB as declared in the source manifest.
- The runtime loads only paths declared in `public/assets/gridwake/manifest.json`.
- Missing, corrupt, or slow assets fall back to GRIDWAKE's lightweight procedural geometry.
- Generated geometry is render-only. It cannot mutate deterministic simulation state or replay hashes.
