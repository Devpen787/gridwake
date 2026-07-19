# Multiplayer Room Authority v1

Status: implementation slice

## Current truth

GRIDWAKE has a verified deterministic solo round. `seed + compiled strategy + ordered
player inputs` is sufficient to reproduce a round, but the application currently has no
identity, room, roster, network transport, command ordering, reconnect contract, or
multiplayer UI. The solo path SHALL remain usable if multiplayer is unavailable.

## Slice goal

Create the smallest truthful multiplayer foundation: a 2-3 player room whose members can
join by code, claim one of the three squad roles, contribute one sentence, become ready,
and receive one server-ordered launch payload. This slice proves the room state machine
locally before connecting it to a browser-to-browser peer transport.

## In scope

- Pure, serializable room state and command protocol.
- Exactly one host and at most three active members.
- Unique Guardian, Scout, and Mender role ownership.
- Room-code creation and join validation.
- Per-member Instinct contribution and ready state.
- Host-only launch after 2-3 active members are ready.
- Stable launch seed, ordered command sequence, and compiled combined Instinct.
- Reconnect-safe member identity within one browser profile.
- Local transport for deterministic tests and same-origin multi-tab playtesting.
- Lobby UI, copyable invite link, explicit connection/truth labels, and recoverable errors.
- Existing solo journey unchanged.

## Out of scope for this slice

- Public internet transport and persistence.
- Authoritative live Pulse ordering and checkpoint reconciliation during the 45-second round.
- Spectators, matchmaking, accounts, rankings, chat, purchases, and moderation tooling.
- Claims that local multi-tab transport is online multiplayer.

## Requirements

### R1 — Room identity

The system SHALL issue a six-character room code using unambiguous uppercase characters.
The UI SHALL accept room codes case-insensitively and normalize whitespace.

### R2 — Bounded roster

The room SHALL contain 2-3 active members for launch. Each active member SHALL have a
stable member ID, display name, unique role, connection state, ready state, and Instinct
source of 1-280 characters.

### R3 — Ordered commands

Every accepted mutation SHALL increment the room sequence exactly once. Commands with a
stale base sequence, unknown member, invalid phase, unauthorized actor, duplicate role,
invalid source, or full roster SHALL be rejected without mutating state.

### R4 — Host authority

Only the host SHALL launch. The host SHALL not launch until every active member is ready
and the roster contains at least two members. Host transfer SHALL be deterministic: the
earliest remaining member becomes host when the current host leaves before launch.

### R5 — Deterministic launch

Launch SHALL lock the roster and create a payload containing room ID, room sequence,
seed, role-ordered contributions, combined source, compiled strategy, and scheduled start
time. The same accepted command log SHALL produce byte-equivalent launch inputs.

### R6 — Truthful degradation

Failure to initialize multiplayer SHALL not break Solo. Local transport SHALL be labeled
`LOCAL ROOM TEST`; public online transport SHALL not be claimed until peer-to-peer
cross-device proof passes.

### R7 — Access boundaries

Online peers SHALL join with an unguessable room secret and a stable ephemeral member
identity. Peer presence SHALL never authorize or settle a game command; the host's
ordered log is room truth and every peer SHALL verify its sequence and checkpoint hash.

## Acceptance scenarios

### Create and share

GIVEN a visitor on the landing screen
WHEN they create a room
THEN a host member and unique room code are created
AND the lobby exposes a copyable join link
AND Solo remains reachable by exiting the room.

### Join and claim

GIVEN an existing lobby with fewer than three members
WHEN a second member joins with a valid code
THEN the member is assigned an unclaimed role
AND both clients converge on the same ordered roster.

### Ready gate

GIVEN two members in the lobby
WHEN either contribution is blank or either member is not ready
THEN launch is disabled with an explicit reason.

### Launch

GIVEN 2-3 members with unique roles and valid contributions who are all ready
WHEN the host launches
THEN exactly one launch command is accepted
AND every member receives the same seed and role-ordered combined Instinct.

### Adversarial command

GIVEN any room state
WHEN a client submits a stale, unauthorized, malformed, duplicate-role, or phase-invalid
command
THEN the command is rejected
AND the sequence and state remain unchanged.

### Transport loss

GIVEN an active local room
WHEN the transport disconnects or a tab reloads
THEN the UI names the state truthfully
AND offers retry or exit
AND never silently creates a divergent room.

## Proof map

| Requirement | Proof |
| --- | --- |
| R1-R5 | Unit tests over the pure reducer and replay determinism |
| R3, R4, R7 | Adversarial command tests plus forged/replayed peer-message tests |
| R5 | Cross-client launch-payload equality test and replay hash check |
| R6 | Existing solo engine tests, build, and browser regression |
| Lobby UX | Desktop and mobile browser screenshots plus two-tab playtest |
| Online claim | Two clean browser profiles on separate network sessions after deployment |
