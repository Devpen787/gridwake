# GRIDWAKE — Design Threat Model Draft

Status: architecture-level draft; no implementation exists to inspect  
Date: 2026-07-18  
Method: assets, actors, trust boundaries, abuse cases, controls, residual risk

## 1. Scope and assumptions

In scope:

- browser, WebSocket/HTTPS gateway, remote MCP surface;
- guest and OAuth-linked sessions, room capabilities, host/moderator/admin roles;
- GPT-5.6 policy/law compilation and deterministic validators;
- room service, authoritative engine, event log, receipt signer/verifier;
- persistence, moderation, reports, privacy/deletion, observability, deployment;
- public, invite, spectator, replay, and shared-receipt paths.

Out of scope for this draft:

- OpenAI/hosting-provider internal implementation;
- user devices and out-of-band communication beyond interface controls;
- a code-level or dependency review, because no GRIDWAKE codebase exists yet;
- financial abuse, because launch forbids payments, prizes, wagering, tokens,
  ads, and transferable value.

Assumptions requiring owner confirmation before a final threat model:

- adults 18+ only;
- public internet deployment, public and invite rooms;
- guest-first with optional OAuth-connected ChatGPT/Codex clients;
- 24 active lights per room and 50 synthetic-client test target;
- room replays private for seven days unless explicitly shared;
- operator identity, hosting region, support staffing, and retention remain unset.

## 2. Security objectives

1. Only the authoritative engine can change canonical game state.
2. A principal can mutate only its current room/light within phase and budget.
3. Natural language and model output can never become arbitrary executable code.
4. Laws remain inside a small immutable constitution.
5. Same committed inputs produce the same signed, independently verifiable result.
6. Private text, OAuth identity, network data, and reports do not leak through
   rooms, replays, logs, model prompts, errors, metrics, or public receipts.
7. Admin/moderation authority is separated, least-privileged, and auditable.
8. Abuse controls preserve availability without inventing human counts or results.
9. Degraded and incident states remain truthfully labeled.
10. Privacy/deletion/appeal routes survive loss of gameplay access.

## 3. Valuable assets

| Asset | Failure consequence |
|---|---|
| canonical round state and tick availability | cheating, broken game, false result |
| room capability and OAuth tokens | unauthorized control or impersonation |
| strategy/law/report text | privacy, safety, reputational harm |
| receipt signing key and event chain | forged verification and loss of trust |
| engine/DSL/law/version artifacts | unverifiable or inconsistent replay |
| admin/moderator credentials | broad compromise and censorship/abuse |
| seed commitment/reveal | biased or predictable games |
| privacy/consent/deletion records | legal and user-rights failure |
| public counts/status labels | deceptive product claims |
| source/build/deployment pipeline | supply-chain compromise |

## 4. Actors

- good-faith visitor, guest, connected player, spectator, host;
- curious tinkerer and authorized security researcher;
- griefer seeking social disruption without economic motive;
- spammer/bot operator seeking capacity or model-cost exhaustion;
- Sybil/colluding group targeting rooms or governance signals;
- prompt-injection attacker targeting compiler, law workers, logs, or tools;
- credential/capability thief;
- malicious or compromised moderator/admin/developer;
- dependency, hosting, observability, moderation, or AI-provider attacker;
- operator acting dishonestly or under key/service compromise.

## 5. Trust boundaries

```text
Untrusted browser / ChatGPT / Codex
  |  TB1: internet, user text, client clocks, duplicate/reordered requests
Gateway and session service
  |  TB2: capability -> room command authorization
Room service / compiler orchestrator
  |  TB3: natural language -> external AI -> untrusted structured candidate
Deterministic DSL/law validators
  |  TB4: certified immutable artifacts -> authoritative engine
Authoritative engine
  |  TB5: events -> persistent log -> receipt signer
Public verifier / replay consumer

Moderator console ----- TB6: privileged human boundary
Admin/deploy pipeline -- TB7: production control and supply-chain boundary
Vendors/telemetry ------ TB8: subprocessors and data-egress boundary
```

Every boundary defaults to deny and revalidates identity, scope, type, size,
phase, version, and replay/idempotency state. Internal network location is not
authorization.

## 6. Entry points

- landing/static assets and invite/share/replay URLs;
- session/consent, room creation/join/leave, WebSocket reconnect;
- strategy compile/confirm, ready, pulse, status, replay download/verify;
- MCP discovery and tools: status, join, program, pulse, law, receipt, leave;
- law proposal/preference, report, block, appeal, support, privacy/deletion;
- OAuth callback/token refresh/disconnect;
- moderator/admin consoles, CI/CD, configuration, secrets, migrations;
- observability/log ingestion, vendor webhooks, scheduled deletion/certification.

## 7. Threats, controls, and residual risk

### T1 — Client authority forgery

Attack: forge position, health, pulse, room/round, host action, or result; replay a
valid command across room or phase.

Controls: opaque random room IDs; short-lived audience/room/round/action-scoped
capability; server-side ownership/phase/budget check; idempotency; strict schema;
authoritative state only; no trust in client clock or client-computed result.

Residual: stolen live session can act until revocation/expiry; XSS or device
compromise remains critical.

### T2 — Race, reorder, duplication, and latency exploitation

Attack: send parallel pulses, exploit arrival order, reconnect to fork state,
withhold then burst commands.

Controls: transactional one-pulse ledger; nonce uniqueness; canonical multiset
resolution; sequence/ack protocol; bounded acceptance window; snapshot plus
event cursor; one authoritative room worker/consensus discipline.

Residual: regional latency affects whether an action reaches cutoff; disclose and
measure, but never resolve collisions by earliest packet.

### T3 — Prompt injection and code/DSL escape

Attack: strategy/law tells GPT to reveal prompts, call tools, create hidden code,
target an identity, exfiltrate text, or alter safety rules.

Controls: user text isolated as data; minimal compiler context; no secrets;
allow-listed tools with no live-engine authority; exact JSON schema; independent
parser/type checker; bounded total DSL; deny unknown fields; no dynamic eval;
property corpus; output encoding; one controlled retry; safe-template fallback.

Residual: model can create semantically poor but syntactically legal policies;
tool/orchestrator bugs may defeat confinement; adversarial evaluation required.

### T4 — Generated-law privilege escalation

Attack: law changes authentication, verifier, seed, identity, moderation, scoring,
or adds an unbounded parameter through nesting, numeric edge, alias, or version
confusion.

Controls: flat typed allow-list; reject unknown/duplicate keys; integer ranges;
canonical encoding; schema and engine version binding; no law-defined code or
observations; certification corpus; one-round expiry; baseline fallback; operator
rollback; constitution changes only through reviewed releases.

Residual: a value within the envelope may still make play unfair; reference
currently does not consume every proposed field, so such fields remain disabled.

### T5 — Griefing with legal actions

Attack: join then idle, route wastefully, herd, disconnect, trigger pulses badly,
coordinate public-room losses, or target newcomers socially.

Controls: no direct attack action; minimum-contribution policy check; safe fallback
on disconnect/fault; congestion feedback; aggregate rather than individual blame;
behavioral rate/reputation only after privacy/fairness review; host removal before
commit; reports/blocks; invite rooms; no economic or ranking payoff.

Residual: intent cannot be proven and minimally legal sabotage remains. Public
rooms need monitoring and perhaps trust-tier matchmaking after evidence.

### T6 — Sybil, collusion, capacity, and governance capture

Attack: many guest/OAuth identities fill rooms, manufacture preference signals,
harass targets, inflate counts, or consume GPT/moderation cost.

Controls: no binding anonymous vote; only certified laws; seed selection from
certified set; capacity/rate/queue controls; proof-of-work/challenge only if
accessible and necessary; provider/device/network risk signals minimized and
retained briefly; public counts clearly defined; synthetic clients labeled.

Residual: no reliable one-human-one-identity guarantee; distributed attacks and
false positives remain. Do not market signals as democratic votes.

### T7 — Seed, spawn, and operator manipulation

Attack: choose seed after seeing policies, selectively abort bad results, bias
spawns, sign fabricated events, or deploy a different engine than verifier.

Controls: commit roster/law/policy/version/seed commitment before reveal;
external/randomness source option; deterministic spawn rotation corpus; signed
artifact manifest; reproducible public verifier; append-only transparency/change
log; independent monitoring; interrupted/invalid labels.

Residual: operator controls availability, keys, release, and which rooms exist.
Cryptographic verification constrains claims; it does not remove operator trust.

### T8 — Receipt/key/verifier compromise

Attack: steal signing key, downgrade receipt version, canonicalization collision,
serve a malicious verifier, omit events, or make old artifacts unavailable.

Controls: hardware/cloud KMS non-exportable key; signer isolated from public
gateway; rotation/key IDs/revocation; domain-separated canonical hashing;
published test vectors; immutable version artifacts; independent verifier build;
content security and signed releases; key-compromise incident state.

Residual: a stolen authorized signing path can mint convincing receipts until
detection. Transparency and key hygiene reduce, not eliminate, this.

### T9 — Privacy leakage and inference

Attack: expose raw strategies, OAuth subject, IP, invite code, report text, block
relationship, prompt, or sensitive law through receipt, URL, logs, analytics,
model provider, error, support, or timing.

Controls: field-level data map; redacted receipts; fragments/opaque IDs; no user
text in general logs; structured errors; encryption; access separation; vendor
minimization/contracts; finite retention; deletion; report confidentiality;
aggregate thresholds; CSP/referrer/cache controls.

Residual: writing style and repeated behavior may allow inference; shared public
content can be copied; legal/operator details and vendor configuration unresolved.

### T10 — XSS, injection, request forgery, and supply chain

Attack: render strategy/law as HTML/shader/log control; SQL/template/command
injection; CSRF OAuth/session mutation; dependency/build compromise.

Controls: contextual output encoding; no dynamic HTML/eval; parameterized queries;
strict CSP/Trusted Types; CSRF/origin/SameSite defenses as applicable; OAuth state,
PKCE, redirect allow-list; dependency pinning/scanning; provenance/SBOM; secret
scanning; protected deploy; isolated preview; reproducible artifacts.

Residual: framework/configuration and dependency zero-days require repo review,
patching, and containment.

### T11 — Denial of service and cost exhaustion

Attack: connection flood, giant/Unicode-degenerate inputs, compile/law spam,
expensive verifier/replay, slow consumer, room explosion, moderation/report spam.

Controls: edge and principal quotas; byte/codepoint/depth limits before expensive
work; bounded DSL; compile cache; admission/queue; per-room resource budget;
backpressure; circuit breakers; template-only degradation; async certification;
separate report abuse controls; spend alarms.

Residual: volumetric attacks require provider capacity; strong controls may harm
shared-network or accessibility users and need appeal/fallback.

### T12 — Privileged misuse

Attack: moderator reads private strategies, admin changes outcome, developer
extracts data/key, support impersonation, unauthorized production query.

Controls: separate roles and origins; hardware-backed MFA; just-in-time access;
approval for sensitive exports/config; field-level access; immutable audit events;
session recording where lawful; no outcome-edit tool; periodic access review;
break-glass alert and expiry.

Residual: a sufficiently privileged colluding group can harm the service; reduce
blast radius and make actions attributable.

### T13 — Moderation failure and adversarial reporting

Attack: encoded abuse evades checks, benign accessibility language is rejected,
mass reports silence users, report content harms reviewers, appeals leak evidence.

Controls: normalize carefully while preserving evidence; layered automated/human
review; category-level errors; reporter reputation/rate without vote-count guilt;
reviewer safety; restricted evidence store; separation of reporter/subject;
appeal and calibration audits; no public accusation count.

Residual: semantic moderation has unavoidable false positives/negatives and needs
staffing, cultural/language coverage, and escalation.

### T14 — Deletion, consent, and policy-state inconsistency

Attack/failure: join under stale terms, duplicate/revoked consent, delete primary
but retain derived/share/cache data, let banned user lose rights access, restore
deleted content from backup.

Controls: versioned acceptance transaction; no capability before success;
purpose/field retention schedule; deletion state machine; tombstone or suppression
to prevent restore; share revocation; separate rights origin; backup expiry tests;
legal/security holds scoped and audited.

Residual: operator/legal requirements are unresolved; distributed deletion is
hard and must be proven against actual vendors and backups.

### T15 — Availability and split-brain round state

Attack/failure: concurrent room workers, region partition, persistence/signing
outage, model failure, stale reconnect, partial deploy.

Controls: single canonical writer or formally consistent lease; fencing token;
version pin per round; immutable event sequence; deployment compatibility matrix;
template-only and browser-only degradation; interrupted/unverified result;
tested rollback and recovery.

Residual: high availability without split brain requires architecture-specific
proof and chaos/soak evidence not yet available.

## 8. Abuse-case trees

### Goal: make an unauthorized light action affect a round

```text
steal capability
OR exploit OAuth/session callback
OR forge room/round ownership
OR replay valid request across scope
OR win pulse race twice
OR compromise gateway/room worker/admin
```

Primary barriers: scoped capabilities, PKCE/state, server authorization, nonce and
transactional ledger, phase/version binding, least privilege, audit.

### Goal: make unsafe natural language execute

```text
escape prompt isolation
AND produce candidate
AND bypass schema/parser/type checker
AND bypass property/minimum-contribution checks
AND reach authoritative engine with new authority
```

Primary architectural defense: the candidate has no authority until every
deterministic gate passes, and the DSL cannot represent a side effect outside the
legal action set.

### Goal: forge a convincing verified outcome

```text
steal signing path
OR exploit hash/canonicalization
OR substitute malicious verifier/artifacts
OR control operator and selectively commit/abort
OR exploit version confusion
```

Primary barriers: isolated KMS, domain-separated canonical format, vectors,
artifact manifest, public independent verifier, commit/reveal, transparency log.

## 9. High-priority security requirements

- `SEC-01` Every mutating command SHALL authorize principal, room, round, phase,
  action, nonce, and budget server-side.
- `SEC-02` Policy/law runtimes SHALL be total, bounded, side-effect-free, and
  unable to call network, file, model, MCP, clock, random, or dynamic eval.
- `SEC-03` Pulse acceptance SHALL be atomic and idempotent under concurrency.
- `SEC-04` The engine SHALL resolve the canonical action multiset independent of
  arrival order and client identity labels.
- `SEC-05` World-law deserialization SHALL reject unknown, duplicate, non-integer,
  nested, aliased, out-of-range, or wrong-version fields.
- `SEC-06` Receipt signing SHALL use an isolated non-exportable key, exact
  canonical bytes, version binding, rotation, revocation, and public vectors.
- `SEC-07` Public receipts/logs/metrics SHALL exclude raw strategy, OAuth subject,
  network identifier, report, token, and moderation evidence.
- `SEC-08` Admin and moderator roles SHALL use separate least-privileged actions,
  MFA, auditable just-in-time access, and no result-edit capability.
- `SEC-09` GPT/MCP/moderation failure SHALL fail to templates/read-only behavior,
  not expanded authority.
- `SEC-10` Round writer failover SHALL use fencing and never produce two canonical
  histories; uncertainty yields interrupted/unverified.
- `SEC-11` CI SHALL test authorization, injection, replay, concurrency, vectors,
  dependencies, secrets, migrations, rollback, and deletion before promotion.
- `SEC-12` Production SHALL have rate/cost/resource limits at edge, principal,
  session, room, text, model, replay, report, and law-certification boundaries.

## 10. Verification plan

Before a production claim:

1. Confirm architecture, operator, deployment, identity, vendors, retention, and
   admin workflows with the owner.
2. Inspect actual code/config/dependencies and map each boundary to files/routes.
3. Create an authorization matrix and negative integration tests for every role
   and MCP/browser command.
4. Add stateful concurrency/property fuzzing for pulse, phase, reconnect, lease,
   law, receipt, and deletion.
5. Run compiler/law prompt-injection corpus and require deterministic reproduced
   counterexamples rather than accepting model “opinions.”
6. Review seed/receipt cryptography and key operations independently.
7. Perform SAST, dependency/secret/container/IaC scans, then manual penetration
   testing against staging.
8. Exercise DoS/cost limits, split brain, vendor outage, key compromise,
   moderation outage, rollback, restore, and deletion from backup.
9. Publish exact release artifact, test evidence, known residual risks, and
   explicitly unverified areas.

## 11. Current verdict

The architecture can substantially constrain cheating because natural language,
clients, and optional OpenAI controllers never own the game state. Its strongest
security property is representational: the accepted policy/law languages cannot
express arbitrary authority.

However, there is currently no implementation to validate. The system is not
presently shown secure, cheat-proof, abuse-resistant, private, or production
ready. The largest unresolved risks are capability/session design, prompt/tool
confinement implementation, room-writer consistency, signing-key integrity,
legal/privacy operations, moderation capacity, and Sybil/griefing pressure.

