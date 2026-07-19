# GRIDWAKE multiplayer authority and adversarial audit

Date: 2026-07-19

Status: implemented P2P beta; production security is not claimed

## Reviewed boundary

This audit covers the current 2-3 player browser room in
`src/multiplayer/room.ts`, `peerTransport.ts`, `input.ts`, and `recovery.ts`.
The transport is Trystero 0.25.2 over WebRTC with Nostr-based discovery. There is
no application database or server authority.

## State and authority result

- The creator is the sole ordering authority for lobby commands, launch, Pulse,
  and checkpoint acknowledgements.
- Every accepted lobby command advances one sequence. Replayed and concurrent
  stale commands fail closed without mutation.
- A connected WebRTC peer ID is bound to one room member ID at join. Later
  commands whose claimed actor does not match that binding are rejected.
- The host alone constructs the launch seed and role-ordered combined Instinct.
- Pulse is single-use and host-ordered. It executes ten logical ticks after the
  furthest known host/request tick, giving delivery one second of lead time.
- Clients report replay hashes every 50 ticks. The host acknowledges a checkpoint
  only after all connected members report the same hash. A mismatch marks the
  result unverified.
- Host loss freezes the room. Live rejoin is intentionally rejected because the
  implementation cannot reconstruct an authoritative mid-round tick.

## Attacks exercised by tests

The reducer suite covers stale sequence replay, fourth-player overflow, duplicate
roles, non-host launch, edit-after-ready, mutation-after-launch, deterministic host
transfer before launch, byte-equivalent launch inputs, malformed Pulse timing, and
too-late Pulse timing. Browser proof covers two independent peers, non-host Pulse,
five-second replay checkpoints, and identical final receipt hashes.

## Residual risks — accepted only for the hackathon preview

1. **Malicious host:** the host can run a modified client, censor commands, choose
   a favorable seed, or fabricate acknowledgements. Checkpoints detect accidental
   divergence among honest clients; they do not make a player host trustworthy.
2. **Guessable room namespace:** six unambiguous base-32 characters provide roughly
   one billion combinations, but are not a cryptographic invitation secret. A
   determined attacker can guess active rooms. There is no public room directory or
   valuable prize, which limits incentive but does not remove the risk.
3. **Unsigned receipts:** replay receipts are reproducible locally and compared by
   peers, but are not signed by an operator or independent verifier.
4. **Network metadata:** WebRTC peers, Nostr relays, and STUN infrastructure can
   process connection metadata and may expose address information. Room payloads
   travel over encrypted WebRTC channels; that does not make the surrounding
   connection metadata invisible.
5. **Availability:** relay outage, NAT restrictions, missing TURN coverage, browser
   suspension, or host departure can prevent or terminate a room.
6. **Moderation:** callsigns and Instinct text are peer-visible user content. The
   preview has rules and a leave path, but no centralized report queue or ban system.
7. **Reconnect:** lobby members can recover their ephemeral identity from same-tab
   session storage. Live rounds cannot safely rejoin and fail closed.
8. **Client compromise:** script injection, malicious extensions, or a compromised
   dependency can bypass client checks. No central secret or service credential is
   shipped, limiting blast radius but not protecting the local user.

## Release conclusion

The architecture is suitable for a free, no-stakes, ephemeral hackathon game when
the UI labels it `P2P BETA`, exposes the privacy boundary, and never claims server
authority, cheat-proof play, permanent rooms, or signed results. It is not suitable
for prizes, rankings, money, persistent identity, public matchmaking, or hostile
competitive play without an independent authoritative service.

## Required evidence before changing the claim

- Three-peer mesh browser proof and same-hash receipt.
- Lobby disconnect/reconnect proof with stable member identity.
- Clean-device cross-network proof after public deployment.
- NAT/TURN failure-path proof on a restrictive network.
- Dependency audit with no known production vulnerability.
- If prizes or ranking enter scope: replace player-host authority with independent
  command ordering and signed receipts.
