# GRIDWAKE — Complete User and Service Paths

Status: product-state specification  
Rule: a screen is not complete unless its success, empty, loading, degraded,
error, privacy, and exit states are defined.

## 1. Actors

- `VISITOR`: has not accepted current required terms.
- `GUEST`: has an ephemeral session and neutral generated callsign.
- `CONNECTED_PLAYER`: guest session linked through a supported OAuth client.
- `SPECTATOR`: sees a delayed/read-only room view.
- `ACTIVE_PLAYER`: owns one committed light for the current round.
- `ROOM_HOST`: can choose public/invite visibility and remove participants; has
  no control over physics, seed, receipts, or another light.
- `MODERATOR`: reviews content and access cases; cannot edit game outcomes.
- `OPERATOR`: manages releases and incidents through separately authenticated
  systems.

## 2. First load

### 2.1 Request and bootstrap

1. Browser requests the canonical HTTPS origin.
2. Edge applies bot/abuse controls without reading game strategy content.
3. Server returns security headers, hashed static assets, locale, current terms
   versions, service status, and a non-tracking essential session mechanism.
4. Before optional consent, the page SHALL NOT load advertising, marketing,
   social, fingerprinting, or non-essential analytics scripts.

### 2.2 First visible frame

The user sees:

- live or prerecorded-at-label ambient grid;
- “One sentence. One light. One shared grid.”;
- `PLAY AS A GUEST` primary action;
- `WATCH` and `HOW IT WORKS` secondary actions;
- links to accessibility, privacy, terms, community rules, status, and support;
- a visible `18+ prototype` label;
- motion/audio off until user preference or interaction permits them.

### 2.3 First-load branches

- Service normal: play and watch enabled.
- No public room capacity: play offers invite code or practice; never a dead end.
- Maintenance: watch a labeled sample and read status; no false live counts.
- Unsupported browser: explain required capability and provide static tour.
- JavaScript unavailable: show product explanation, policy links, and support.
- Offline: browser-native error/retry; do not simulate a live room.
- Terms endpoint unavailable: watching static tour is allowed; joining is not.

## 3. Consent and age gate

1. User selects `PLAY AS A GUEST`.
2. A concise panel explains: 18+ prototype, communal public game, text moderation,
   gameplay receipt, retention summary, no prizes/purchases, and optional OpenAI
   connection.
3. User must affirm they are at least 18 and accept linked Terms and Community
   Rules. Privacy notice is acknowledged as notice, not bundled consent.
4. Optional analytics/marketing consent, if ever added, is separate, off by
   default, and refusal has no gameplay cost.
5. The server records terms/rules versions, timestamp, locale, and session ID.

Branches:

- Under 18 / cannot affirm: no account or strategy collection; static watch tour
  and policy links only. Product and counsel must reassess before permitting any
  minor path.
- Declines terms: return to first load; no room capability created.
- Policy version changed during join: show the changed clauses and reconfirm.
- Consent write fails: do not join; retry safely with no duplicate record.

## 4. Guest creation and settings

1. Server issues an opaque session and generated neutral callsign.
2. User can randomize the callsign from a fixed moderated vocabulary; cannot
   enter arbitrary display text at launch.
3. Settings preview asks for motion, contrast, color palette, audio/haptics,
   screen-reader summaries, and text size. Defaults follow device preferences.
4. User may enter public matchmaking, an invite code, or practice.

The page explains what a guest loses by clearing storage: room reconnection,
device-scoped blocks, and privacy-request verification. It never pressures the
user to create an account because accounts are not needed for launch.

## 5. Room entry

### 5.1 Public room

1. Match service chooses a region/capacity-compatible room.
2. UI defines counts separately: `active`, `ready`, `spectating`, and
   `synthetic test clients` (test clients never appear in production rooms).
3. User enters join phase or spectates if commit has begun.

### 5.2 Invite room

1. User pastes a normalized code; URL fragments are not sent to analytics.
2. Server checks existence, expiry, capacity, block lists, and room state.
3. Invalid, expired, full, blocked, or rate-limited outcomes get distinct
   messages without revealing private membership.

### 5.3 Host creation

Host chooses only public/invite visibility, maximum lights from 2–24, and
whether spectators are allowed. Host cannot choose favorable seeds, difficulty,
player spawn, unverified law, or outcome. Removing a participant takes effect
before commitment or next round unless an immediate safety action is required.

## 6. Ten-second learn-by-doing preview

The private local preview teaches three facts:

1. corruption moves inward;
2. two differently marked trails repair a threatened sector;
3. the core must remain alive for 60 seconds.

It demonstrates movement and pulse without consuming a live action. It supports
keyboard, touch, screen reader, reduced motion, pause, replay, and skip. Skipping
does not reduce authority or label the player inexperienced.

## 7. Programming a light

### 7.1 Draft

- Text box limit: 240 characters with visible counter.
- Example strategies and verified templates remain available.
- The client performs only ergonomic checks; the server owns normalization,
  moderation, rate limit, prompt isolation, and compilation.
- Private strategy text is not shown to the room.

### 7.2 Compile

1. User selects `COMPILE`.
2. UI shows cancellable progress with an 8-second target, not an invented percent.
3. Server moderates, calls GPT-5.6 if available, parses the result, verifies the
   DSL, property-tests it, and returns a candidate or typed errors.
4. UI shows plain summary, assumed meanings, removed clauses, and the small
   policy program.
5. User selects `CONFIRM`, `EDIT`, or `USE SAFE TEMPLATE`.

### 7.3 Compile branches

- Empty: offer templates; do not silently invent intent.
- Unsafe/abusive: specific category-level explanation; no echo of disallowed
  content to other users.
- Ambiguous: assumptions highlighted; confirmation required.
- Invalid model output: one controlled retry, then template.
- Timeout/model outage: template path and status; room remains usable.
- Phase closes: candidate saved only for next round; user spectates current one.
- Duplicate request: idempotency key returns the first result.
- Changed law/compiler version: invalidate preview and explain why.

## 8. Ready and commitment

1. `READY` is enabled only for a confirmed policy.
2. Ready may be cancelled until commit begins.
3. At commit, server freezes active roster, engine/DSL/law/policy versions, seed
   commitment, and initial state.
4. UI shows a three-second accessible countdown and explains that policy edits
   now apply to next round.
5. Disconnected-not-ready players are excluded. Disconnected-ready players use
   the disclosed safe fallback and grace rule.

If fewer than two ready players remain, return to join or offer explicitly
labeled private practice. Never fill a public roster with hidden bots.

## 9. Live round

The default HUD contains only:

- the grid;
- core health and 60-second clock;
- eight sector pressure cues;
- the player's policy summary and light marker;
- one large `PULSE` control with available/spent state;
- connection/accessibility menu and leave control.

### 9.1 Pulse

1. User activates pulse or its keyboard command.
2. Client previews target and sends nonce, room, round, and target.
3. Server checks owner, phase, target, capability, nonce, and remaining budget.
4. Accepted pulse appears on the next authoritative state update. It is spent
   only on acceptance.
5. Repeats return the original result; a second distinct pulse is rejected.

### 9.2 Connection branches

- Brief loss: reconnect with last event sequence; server sends missing snapshot.
- Cannot catch up safely: spectate authoritative state; do not local-predict.
- Capability expired: refresh through session, never by trusting the client.
- Kicked/banned: stop mutating immediately, show reason category and appeal.
- Server pause: freeze official clock, show incident state; receipt records pause.
- Region failure: committed round becomes interrupted/unverified unless exact
  state and receipt chain can be recovered under a tested protocol.

### 9.3 Leave

Leaving is always available. During a committed round, the safe fallback drives
the light until round end, then the slot is released. The UI explains this before
confirmation and offers `LEAVE NOW` without shame or retry pressure.

## 10. Resolution and results

1. Engine stops at tick 600 or core health zero.
2. Server finalizes event hash, reveals seed, signs receipt, and returns outcome.
3. UI shows `GRID HELD` or `CORE LOST`, final health/time, aggregate coordination
   patterns, receipt verification state, and accessible replay.
4. `PLAY AGAIN` and `LEAVE` have equal prominence. `VIEW RECEIPT`, `REPORT`, and
   `PROPOSE A LAW` are secondary.

No result names a worst player, ranks contribution, assigns an MVP, or fabricates
causal certainty. If analysis is model-generated it is labeled and derived only
from aggregate structured events.

### 10.1 Receipt states

- Verified: signature and local recomputation pass.
- Pending: signer or verifier still working; no green check.
- Interrupted: round did not reach canonical resolution.
- Invalid: signature, hash, version, or recomputation mismatch; preserve evidence
  and route to incident handling.
- Unverifiable: required engine/version artifact unavailable; never call verified.

## 11. Replay and sharing

- Default replay visibility is room-scoped for seven days in the prototype.
- A share action creates a new redacted public link only after explicit consent.
- The shared receipt contains no raw strategy, OAuth identity, IP, report, or
  moderation content.
- User can revoke their share link; cryptographic copies already downloaded by
  others cannot be recalled, and the UI says so.
- Replay supports pause, speed, sector transcript, reduced motion, and download
  of the verifier input.

## 12. World-law path

1. A completed-round participant submits at most one 160-character proposal.
2. UI says proposals are public only if moderated and certified; preference
   signals are non-binding.
3. Proposal states: queued, moderated rejection, compiling, verification failed
   with counterexample, certified, expired, applied, revoked.
4. Certified card shows exact parameter diff, predicted tradeoff, test report,
   version, expiry, and preference count labeled `signals`, not `votes`.
5. Server selects only from certified cards using committed seed; baseline is
   always available.
6. Emergency rollback is operator-controlled and logged.

## 13. Report, block, enforcement, appeal

### 13.1 Report

Sources: room menu, result, law card, shared receipt, support page. User selects
a category, optionally describes harm, and chooses whether to attach relevant
room/law identifiers. Never request passwords, private keys, or unnecessary PII.

On success, show reference and safety guidance. On failure, preserve the draft
locally with consent and provide a support route. Reports are rate-limited without
revealing whether another person was already reported.

### 13.2 Block

Connected accounts can avoid future matching where feasible. Guest blocks are
device-scoped, can be lost with storage, and cannot promise global enforcement.
Blocking never tells the blocked party who acted.

### 13.3 Enforcement and appeal

Notices contain affected capability, reason category, duration, effective time,
policy link, and appeal method. Appeals get a reference and review status. Safety
or legal constraints may limit disclosed evidence. Moderators cannot alter a
completed result or retroactively mark an invalid receipt valid.

## 14. Settings, privacy, and account-equivalent controls

Accessible from every non-modal screen:

- accessibility and audio;
- room/replay visibility;
- essential session details and connected clients;
- consent history and optional-consent revocation;
- data access/download request;
- delete session-linked data request;
- shared-link revocation;
- blocks and reports submitted;
- terms/privacy/community-rules versions;
- disconnect OpenAI client;
- support and status.

Deletion requires sufficient session proof, lists exceptions and expected timing,
revokes capabilities immediately, queues primary-store deletion, and tracks
backup expiry separately. Security/legal evidence holds are narrowly scoped and
disclosed where lawful. The final response must distinguish request received,
primary deletion complete, and backup expiry—not collapse them into “deleted.”

## 15. Terms changes

- Material changes show a plain-language summary and effective date before the
  next join; acceptance is versioned.
- Non-material notice may be passive where legally appropriate.
- Declining changed terms prevents future play but preserves policy access,
  privacy requests, appeal, and deletion.
- Emergency community-rule changes may take immediate effect for safety, with
  notice and change log.

## 16. Support, status, and maintenance

- Support has product, accessibility, privacy, safety, security, and appeal
  categories with expected response targets once operator capacity is known.
- Vulnerability reports have a separate safe-harbor/contact policy before public
  launch; do not ask researchers to submit secrets through general support.
- Status distinguishes website, rooms, compiler, MCP, receipts, moderation, and
  privacy requests.
- Maintenance announcements include start, expected effect, and update time.
- A static status origin must not depend entirely on the failed game stack.

## 17. Page and component inventory

Required routes/components:

- `/` landing and service state;
- `/how` mechanics and AI honesty;
- `/play` consent, guest creation, matchmaking;
- `/room/:opaqueId` lobby/program/live/result state machine;
- `/watch/:opaqueId` delayed read-only state;
- `/replay/:opaqueId` room-scoped replay;
- `/share/:opaqueId` explicitly public redacted replay;
- `/verify` local receipt verifier;
- `/laws` certified, failed, applied, expired, revoked states;
- `/settings` accessibility/session/privacy/clients;
- `/report`, `/appeal`, `/support`, `/status`;
- `/terms`, `/privacy`, `/community`, `/accessibility`, `/security`;
- global not-found, expired, forbidden, rate-limited, offline, maintenance,
  unsupported-browser, and fatal-error states.

## 18. End-to-end acceptance scenarios

1. GIVEN a first-time keyboard user, WHEN they decline optional settings and use
   a template, THEN they join and finish a round without mouse or account.
2. GIVEN reduced motion and screen reader preferences, WHEN live state changes,
   THEN semantic sector/core updates remain usable without animation or color.
3. GIVEN a prompt-injection strategy, WHEN compiled, THEN only schema-valid DSL
   can proceed and rejected instructions never enter runtime.
4. GIVEN two pulse requests with different nonces, WHEN both arrive, THEN exactly
   one is accepted and the other is explicitly rejected.
5. GIVEN duplicate/reordered action messages, WHEN resolved, THEN the replay hash
   and outcome match the canonical event set.
6. GIVEN GPT outage, WHEN a room programs lights, THEN templates work and the
   deterministic round remains playable.
7. GIVEN a late joiner, WHEN commit has started, THEN they spectate and cannot
   mutate the current round.
8. GIVEN an unsafe law attempting to change authentication, WHEN certified, THEN
   schema rejection occurs before simulation.
9. GIVEN an invalid receipt, WHEN viewed, THEN it is labeled invalid and routed
   to incident handling, never cosmetically shown as verified.
10. GIVEN terms refusal or deletion, WHEN the user exits, THEN gameplay authority
    is revoked while privacy/support/appeal routes remain available.

