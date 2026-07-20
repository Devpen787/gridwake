# Release QA checklist — demo-final-polish

Run after `npm ci && npm run verify`. Mark only what was actually exercised.

## Automated

- [x] `npm run verify` (typecheck + test + build + golden + sensitivity)
- [x] Replay hash unchanged by render/audio polish (seed 42 default strategy → `3dc576c7` before/after Prompt 05)
- [x] CI workflow present: `.github/workflows/verify.yml`

## Desktop solo

- [ ] Landing → each tactic starter updates sentence + summary
- [ ] Blank sentence uses default Instinct
- [ ] Zero-signal / invalid sentence surfaces error
- [ ] Controls hint appears once per session; dismisses on action / timeout
- [ ] Possession 1/2/3, WASD, Escape
- [ ] Pulse click + Space
- [ ] Sound unlock on gesture; mute persists
- [ ] Event toasts for intercept/repair/damage/Pulse
- [ ] Result grade; COPY RECEIPT
- [ ] TUNE SAME GRID → VS LAST ATTEMPT; NEW GRID clears comparison

## Responsive

- [ ] 390×844 — no horizontal overflow; toast below timer
- [ ] 360×740 — mobile controls do not cover Pulse
- [ ] 1440×900 — mono font + favicon load

## Accessibility

- [ ] Keyboard-only path through Solo
- [ ] Audio toggle has accessible name
- [ ] `prefers-reduced-motion`: no arena kick / phosphor drift animation

## Multiplayer

- [ ] Two-tab create/join
- [ ] No possession UI in room
- [ ] Honest P2P labels on result

## Deploy proof

- Deploy commit SHA: see git tip after `fix: close final demo regressions`
- Deployment ID: `dpl_A6v9V47zfayVNMvZHt6MFQk6Bf3h`
- URL: https://gridwake.vercel.app
- Primary `/feedback` Session ID: `PENDING` in `docs/BUILD_WEEK_EXTENSION.md`
