# GRIDWAKE — Master Product and Operating Blueprint

Status: design specification, not an implementation claim  
Version: 0.1, 2026-07-18  
Track: OpenAI Build Week — Apps for Your Life

## 1. Product in one sentence

GRIDWAKE is a 60-second communal strategy game in which each person describes
how one light should protect a shared neon grid, GPT-5.6 turns those intentions
into safe executable policies, and a deterministic server proves whether the
crowd kept the core alive.

The emotional promise is simpler: **one sentence, one light, one shared grid**.

## 2. Why this should exist

Most multiplayer systems optimize comparison, accumulation, or domination.
GRIDWAKE asks a different question: can strangers make one resilient thing
together when no one can control the whole?

It revives the legibility of early arcade games—move, glow, survive—but adds a
new interface that has only recently become practical: many natural-language
intentions are compiled, checked, simulated, and connected to one live world.
GPT-5.6 is not decorative narration and it is not the game clock. It is the
intent compiler and preflight verifier.

## 3. Non-negotiable product boundaries

GRIDWAKE SHALL:

- start in a browser without an account;
- explain the objective in one sentence and teach through a 10-second preview;
- support 2–24 active human lights in a public or invite-code room;
- run one 60-second deterministic round from an authoritative server;
- let each player submit one short strategy and use one live `PULSE` per round;
- show shared health, shared danger, and shared outcome;
- use GPT-5.6 only before or between ticks, never to decide live physics;
- make every replay reproducible from versioned inputs;
- provide keyboard, reduced-motion, high-contrast, and non-color-only cues;
- allow report, privacy, deletion, support, and appeal paths.

GRIDWAKE SHALL NOT launch with:

- money, prizes, wagering, tokens, loot, ads, paid advantage, or scarcity sales;
- individual leaderboards, public failure rankings, streak punishment, or daily
  obligation mechanics;
- open chat, arbitrary usernames, direct messaging, or spectator betting;
- client-authoritative movement, client-chosen seeds, or model calls in a tick;
- generated laws that reference identities or change security, moderation,
  authentication, persistence, scoring, or the law verifier itself;
- claims that the design or future implementation is “unhackable.”

## 4. Anchor experience

1. A visitor opens a link and sees the live grid immediately.
2. They choose `PLAY AS A GUEST`, accept the required terms, and receive an
   ephemeral light with a generated neutral callsign.
3. A 10-second sandbox shows: corruption advances from the edge; two distinct
   trails can repair a threatened sector; the group must protect the core.
4. The player types a strategy such as: “Stay near the weakest side, reinforce
   another light, and pulse only if the core is in danger.”
5. GPT-5.6 compiles it into a visible, bounded policy. The player confirms or
   edits it. If compilation fails, a safe default is offered.
6. At the synchronized start, every light follows its policy on the shared grid.
   The player can spend one live pulse.
7. Sixty seconds later, the room sees one result, a replay receipt, and a short
   explanation of the group pattern—never a blame list.
8. Players may replay, leave, or propose one sentence for the next world law.

The full state-by-state journey is in `GRIDWAKE_USER_PATHS.md` and
`product-path-model.yaml`.

## 5. The game

### 5.1 World

- The arena is a square cell grid rendered as a dark neon plane.
- The `CORE` occupies protected center cells and has health from 0 to 10,000.
- Eight logical sectors divide the board for policy decisions and accessibility
  descriptions. Rendering may contain more cells; sector math remains exact.
- `CORRUPTION` enters from boundary cells and creates sector pressure.
- Each human owns one `LIGHT` for one room session.
- A light leaves a temporary `TRAIL`. Trails have owner join ordinals and expiry
  ticks, not public account identifiers.
- Reclaiming a corrupted cell requires qualifying trails from at least two
  distinct active lights. One player cannot manufacture cooperation by tracing
  over their own path.
- A `PULSE` temporarily stabilizes a bounded local area. Each active light has
  exactly one accepted pulse per round.
- Simultaneous pulses stack by accepted count; their effect does not depend on
  packet order or an arbitrarily selected “first” player.

### 5.2 Round clock

| Phase | Duration | Mutable inputs |
|---|---:|---|
| Join | 20–90 s | room membership, accessibility settings |
| Program | 30–90 s | strategy draft and confirmed compiled policy |
| Commit | 3 s | none; roster, law, policies, seed commitment freeze |
| Play | 60 s | one pulse per active light; no policy edits |
| Resolve | under 3 s | none; hash, receipt, result |
| Reflect | 15–90 s | next-round choice and bounded law proposal |

Late joiners spectate and enter the next program phase. A room begins with at
least two ready lights or explicitly offers a private practice round that cannot
produce a public receipt.

### 5.3 Tick contract

The canonical engine runs at 10 ticks per second for 600 ticks. Rendering may
interpolate at any frame rate but SHALL NOT alter state.

For every tick `t`, the server:

1. reads the same frozen state `S_t` for every policy;
2. evaluates each policy under a fixed instruction and time budget;
3. validates proposed actions against the legal action set;
4. sorts accepted actions by canonical action tuple, not arrival time;
5. resolves motion, collision, trail, repair, pulse, corruption, and core health
   in that fixed order;
6. emits `S_(t+1)` and appends a canonical event to the replay hash.

All values affecting outcomes are integers. No floating-point value, local
clock, browser frame, network latency, display name, or LLM output enters a tick.

### 5.4 Legal action set

At a tick a policy may emit exactly one of:

- `MOVE(N|E|S|W)`;
- `HOLD`;
- `REINFORCE(sector)` if the light can legally route there;
- `PULSE(sector)` if the player's one pulse is unspent.

Illegal, missing, late, or over-budget actions become `HOLD`. Repeated policy
faults cause the safe fallback policy to take over. The user remains connected
and sees a plain explanation after the round.

### 5.5 Win and loss

- `SHARED WIN`: core health is greater than zero after tick 600.
- `SHARED LOSS`: core health reaches zero at or before tick 600.
- There is no individual victory, placement, payout, or hidden MMR.
- A round receipt may show aggregate coverage, repairs, coordination events, and
  pulse timing. It SHALL NOT rank named players.

## 6. Natural-language strategy compiler

### 6.1 Input and output

The player provides at most 240 Unicode characters. GPT-5.6 receives:

- the strategy text;
- the exact strategy DSL grammar and parameter limits;
- the current certified world-law parameters;
- safety and minimum-contribution requirements;
- examples and structured error definitions.

It returns structured JSON containing `dsl`, `plain_summary`, `assumptions`, and
`rejected_clauses`. A deterministic parser—not the model—accepts or rejects it.

Example:

```text
IF core_health < 35% AND pulse_available THEN PULSE(highest_pressure)
ELSE IF ally_count(weakest_sector) < 2 THEN ROUTE(weakest_sector)
ELSE PATROL(core_ring, clockwise)
```

### 6.2 Compiler guarantees

A confirmed policy SHALL:

- parse against a versioned grammar;
- use only allow-listed observations and actions;
- terminate within a fixed step budget;
- contain no free text at runtime;
- make no network, file, model, MCP, or clock call;
- contain no account, callsign, IP, geography, or protected-trait predicate;
- pass static type, reachability, and minimum-contribution checks;
- produce legal outputs for every state in the verifier corpus;
- display an understandable summary before confirmation.

Prompt text is untrusted data. Instructions embedded in it cannot alter the
compiler system prompt, tool list, schema, verifier, or server configuration.

### 6.3 Failure behavior

- Unsafe clause: remove only the clause, explain why, require confirmation.
- Ambiguous intent: show the compiler's assumption.
- Invalid output: retry once with structured diagnostics, then offer a safe
  local template without another model call.
- Model unavailable: templates remain playable; the room does not block.
- Policy runtime fault: `HOLD` for that tick, safe fallback after threshold.

## 7. Why GPT-5.6 and OpenAI are materially central

The honest claim is **newly practical with GPT-5.6**, not “impossible before.”

- GPT-5.6 converts varied human intent into one strict policy language while
  explaining rejected or assumed clauses.
- Programmatic Tool Calling can orchestrate bounded pre-round tasks—compile,
  lint, simulate, compare counterexamples, and register—without placing the
  model in the live loop.
- A multi-agent preflight can separate builder, adversary, and judge roles for
  a proposed world law. This is defense in depth, not proof by model consensus.
- Persisted reasoning and prompt caching can reduce repeat work for an unchanged
  grammar and safety envelope. Exact product behavior still needs measurement.
- One remote MCP server exposes the same bounded room tools to a ChatGPT App and
  Codex, making them optional controllers of the same authoritative browser
  world rather than separate games.

Official capability references:

- [GPT-5.6: what is new](https://developers.openai.com/api/docs/guides/latest-model#what-is-new)
- [Programmatic Tool Calling](https://developers.openai.com/api/docs/guides/tools-programmatic-tool-calling)
- [Multi-agent workflows](https://developers.openai.com/api/docs/guides/responses-multi-agent)
- [Apps SDK and MCP](https://developers.openai.com/apps-sdk/concepts/mcp-server#why-apps-sdk-standardises-on-mcp)
- [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp)

### 7.1 MCP tools

| Tool | Caller | Server checks | Effect |
|---|---|---|---|
| `get_grid_status` | anyone | room visibility | read-only summarized state |
| `join_grid` | authenticated connector | capacity, room, terms version | reserves next-round light |
| `program_light` | joined player | ownership, phase, DSL verification | registers confirmed policy |
| `pulse` | active player | ownership, phase, nonce, one-use budget | queues one pulse |
| `propose_world_law` | eligible participant | rate, text safety, phase | creates untrusted proposal |
| `get_replay_receipt` | participant/public room | visibility policy | returns signed receipt |
| `leave_grid` | joined player | ownership | releases future participation |

MCP never grants an agent more authority than the linked human. Every mutating
call requires a short-lived room capability, idempotency key, and server-side
phase check.

## 8. Human psychology translated into mechanics

The psychology is an ethical design constraint, not a bag of retention tricks.

| Human need or failure mode | Design response | What is deliberately absent |
|---|---|---|
| Competence | immediate preview, clear cause/effect, editable compiler summary, graduated practice | opaque stat builds |
| Autonomy | player writes intent and may accept, edit, or choose a template | forced “optimal” strategy |
| Relatedness | shared goal, distinct-trail repair, visible rescue moments | public blame and rank |
| Flow | clear 60-second goal, readable danger, direct feedback, challenge envelope | endless variable grind |
| Conditional cooperation | show how many sectors are covered and confirm others are contributing | fake activity or inflated participant counts |
| Loss aversion | losses teach a group pattern; one-click replay | paid save, broken streak, shame notification |
| Social proof | show real active/ready counts with definitions | bots represented as humans |
| Agency under pressure | one pulse with clear preview and undo before server acceptance | frantic purchase or repeated tapping |
| Freshness | certified world law changes one bounded parameter | unbounded procedural chaos |

Self-determination research connects game enjoyment with competence, autonomy,
and relatedness. Flow research emphasizes skill/challenge balance, clear goals,
feedback, concentration, and control. Public-goods experiments also show why
visible real cooperation matters: many people cooperate conditionally and reduce
effort when they expect others to contribute less. These findings motivate the
mechanisms; they do not prove GRIDWAKE will cause a particular psychological
effect. See [Ryan, Rigby, and Przybylski](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2006_RyanRigbyPrzybylski_MandE.pdf), [flow and mobile games](https://pmc.ncbi.nlm.nih.gov/articles/PMC8943660/), and [Fischbacher and Gächter](https://www.aeaweb.org/articles?id=10.1257%2Faer.100.1.541).

### 8.1 Ethical engagement rules

- No dark patterns, false urgency, disguised ads, or preselected marketing.
- No reward for inviting contacts.
- No penalty for leaving, pausing, or disabling notifications.
- No infinite scroll. After each round, `LEAVE` and `PLAY AGAIN` have equal
  visual weight.
- Notifications are off by default and, if later added, must be granular and
  revocable.
- Session length and elapsed time remain visible.

## 9. Mechanism and game-theory design

### 9.1 Strategic objective

Each player chooses a policy `π_i`. The mechanism maps the unordered policy
multiset, one bounded live action per player, a committed seed, and certified
world parameters to one public outcome.

The desired equilibrium is participation in useful coverage, not personal score
maximization. Because rewards are shared and there is no transferable value,
many motives for farming and kingmaking disappear. They do not disappear
entirely: griefers may still value disruption.

### 9.2 Failure modes and mechanism responses

| Failure | Mechanism response | Residual risk |
|---|---|---|
| Free riding | compiled policy must have reachable contribution; inactive slots are removed before difficulty freeze | a minimally legal policy can still be weak |
| Herding | congestion reduces redundant defense; UI shows uncovered sectors | coordinated external group can herd intentionally |
| Sabotage | action set has no direct attack; invalid actions become hold; anomaly limits | legal but wasteful routing remains possible |
| Sybil swarm | no valuable reward; per-room capability, connection and rate controls; no raw one-account-one-vote law activation | distributed attackers can consume capacity |
| Collusion | shared outcome and no rank reduce benefit; laws cannot target players | groups can still ruin public rooms |
| Arrival advantage | simultaneous resolution; join ordinal affects only deterministic tie breaks and is committed before seed reveal | queue manipulation needs monitoring |
| Latency advantage | server tick and phase windows; arrival order never resolves collisions | late pulse may miss a cutoff |
| Host manipulation | pre-round seed commitment, versioned inputs, signed receipt, public verifier | operator still controls deployment and key |
| Law capture | certification plus narrow envelope; preference signal is advisory; cooldown and rollback | operator has final emergency authority |

### 9.3 Contribution contract

A policy is eligible only if static analysis can reach a stabilizing action and
property tests show at least `C_min` legal contribution actions across the
standard corpus. An active light that disconnects receives the safe fallback.
If it remains absent beyond the grace period, its slot is removed next round.

This prevents literal idling from masquerading as participation. It cannot prove
good intent and must not be presented as such.

### 9.4 Symmetry and fairness

- Aggregate outcome is invariant to display-name and account-ID changes.
- Actions are a multiset; input arrival order does not change resolution.
- Spawn positions rotate from seed and join ordinal; over a test corpus, each
  ordinal must receive each spawn class equally within one occurrence.
- Difficulty freezes after ready roster commitment and before seed reveal.
- The verifier checks replay determinism, action legality, one-pulse budgets,
  health/pressure bounds, and safe-law bounds.

The exact provisional mathematics and executable reference are documented in
`GRIDWAKE_FORMAL_VALIDATION.md`.

## 10. World-law governance

### 10.1 What a law is

A world law is a versioned set of bounded parameter changes for the next round,
for example: “Trails last 10% longer, but corruption gets one extra expansion
every fifth tick.” It is not code and cannot create a new observation or action.

### 10.2 Lifecycle

1. Any participant from a completed round may submit one 160-character proposal
   during reflection.
2. Text passes moderation and prompt-injection isolation.
3. GPT-5.6 proposes a typed law object and plain-language consequence.
4. A deterministic schema validator rejects out-of-envelope fields or values.
5. Static invariants and the reference simulator test deterministic vectors,
   200 seeds, all room sizes, idle/disconnect cases, and baseline difficulty.
6. An adversarial model may search for counterexamples; every finding must be
   reproduced by deterministic code to count.
7. Passing proposals enter a certified set with a machine-readable report.
8. Players may signal preference. Signals are displayed as non-binding because
   anonymous accounts do not establish one-human-one-vote.
9. The server selects from the certified set using the already committed seed,
   or uses the baseline law if the set is empty.
10. One law applies for one round, then expires unless re-certified.

### 10.3 Immutable constitution

World laws cannot alter:

- authentication, authorization, rate limits, moderation, privacy, retention,
  logging, cryptography, receipts, seed protocol, or terms;
- the policy grammar, action set, tick order, player identity boundary, shared
  win definition, law validator, safe parameter envelope, or emergency stop;
- purchases, rewards, ranks, transferable value, invitations, or notifications.

Only a versioned product release, with human review and a new verification
packet, may change this constitution.

### 10.4 Operator authority and accountability

The operator may pause rooms, disable connectors, reject content, revoke a law,
or roll back a release for safety and reliability. Such actions go into a public
status/change log without exposing security-sensitive or personal data. Players
do not vote on incident response, privacy rights, legal duties, or access control.

## 11. Architecture

```text
Browser / ChatGPT App / Codex
            |
      HTTPS + WebSocket
            |
  Gateway: auth, room capability, rate limit, moderation
            |
  Room service ---- Policy compiler service (GPT-5.6 before round)
            |       Law certification workers (offline/between rounds)
            |
  Deterministic authoritative engine
            |
  Event log -> replay hasher -> receipt signer
            |
  minimal operational store + deletion jobs + audit metrics
```

### 11.1 State authority

- The engine owns round state.
- The room service owns membership and phase state.
- The policy service returns candidates; the deterministic verifier owns policy
  acceptance.
- The client owns only presentation and user input.
- MCP and WebSocket calls converge on the same authorization and command path.
- The database is persistence, not a second game engine.

### 11.2 Identity

- Guest: random session identifier, generated neutral callsign, short-lived room
  capability, no public profile.
- Connected OpenAI client: OAuth subject is mapped to an internal opaque ID;
  OpenAI credentials and conversation contents are never requested or stored.
- Admin: separate identity provider, hardware-backed MFA, least privilege,
  audited actions, no admin endpoint on the public game origin.

### 11.3 Replay receipt

A receipt contains canonical version IDs, room visibility, ready roster count,
policy hashes, law hash, seed commitment and reveal, ordered accepted input
events, final state hash, outcome, server signing-key ID, and signature.

It excludes raw strategy text, IP address, OAuth subject, display name, and
moderation evidence. A public verifier can recompute the result but cannot prove
that the operator did not omit an event before commitment or protect against a
compromised signing key.

## 12. Moderation and community safety

The launch surface is intentionally small: short strategy text, short law text,
generated callsigns, room codes, and optional receipt sharing.

- Apply Unicode normalization, length limits, control-character rejection,
  URL/credential/PII detection, and text classification before storage/display.
- Never render user text as HTML, shader source, SQL, shell, template, or log
  control sequence.
- Strategy text is visible only to its author by default. Room results use a
  generated aggregate summary.
- Law text is not publicly displayed until it passes moderation.
- Reports accept a reason category and optional description; reporters receive
  a reference number, not an adjudication promise.
- Blocking hides future room co-presence where accounts permit it; guest-only
  blocking is necessarily device-scoped and imperfect.
- Credible threats, child-safety material, or severe abuse follow a restricted
  escalation playbook and evidence-retention exception.

## 13. Privacy and legal product requirements

The prototype is designed for adults 18+. That is a product assumption, not a
legal determination that child-privacy duties cannot apply. The FTC explains
that COPPA can cover child-directed services and general-audience services with
actual knowledge of collecting personal information from a child under 13.
Before launch, counsel must assess audience design, age handling, and operating
jurisdictions. See the [FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).

Privacy design follows purpose limitation and data minimization: collect only
what is needed for rooms, safety, receipts, and reliability; publish retention
windows; support access/deletion where applicable; separate operational security
logs from gameplay analytics. These principles align with
[GDPR Article 5](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679).

Required pre-production decisions:

- legal operator name, address, contact, and data-protection contact;
- hosting and subprocessors, international transfers, lawful bases, and
  jurisdiction-specific rights;
- exact field-by-field retention schedule and deletion backup behavior;
- age policy and whether any minor may participate;
- governing law, venue, dispute terms, and consumer-law exceptions;
- incident-notification and law-enforcement request procedures.

Draft product-facing policies are in `policies/`. They are placeholders for
qualified legal review, not legal advice.

## 14. Accessibility

Target WCAG 2.2 AA, which W3C recommends for current applicability. See
[WCAG 2.2](https://www.w3.org/TR/WCAG22/).

- Every color state also has shape, texture, label, and optional audio cue.
- Full keyboard path: focus indicator, skip links, no keyboard trap.
- Reduced motion replaces travel effects with state transitions.
- Screen-reader mode describes sector pressure, core health, phase time, pulse
  status, and result in throttled live regions.
- High-contrast and color-vision palettes are first-load settings.
- Touch targets, text resize, focus-not-obscured, and authentication steps meet
  relevant AA criteria.
- No critical decision requires sub-second reaction; pulse has keyboard and
  assistive-technology activation.

Automated checks are necessary but insufficient; release requires keyboard,
screen-reader, zoom, contrast, reduced-motion, and cognitive walkthroughs.

## 15. Operations and maintenance

### 15.1 Environments and release

- Separate development, staging, and production projects and secrets.
- Version engine, DSL, law schema, model prompt, moderation policy, MCP schema,
  client, receipt format, and public verifier independently.
- CI gates: unit/property/integration tests, deterministic golden vectors,
  dependency and secret scanning, migration rehearsal, accessibility checks,
  load test, and rollback smoke test.
- Canary production rooms use synthetic clients and cannot appear as humans.
- A release is promoted only after the proof packet links exact commit, artifact
  hashes, test outputs, known exceptions, and rollback target.

### 15.2 Service objectives (launch targets, not current evidence)

| Measure | Target |
|---|---:|
| Room command availability | 99.5% monthly |
| Tick deadline met | 99.9% of ticks |
| State broadcast p95 | under 250 ms regionally |
| Policy compile p95 | under 8 s |
| Round receipt p95 | under 3 s after resolution |
| Recovery point | at most 15 min for persistent metadata |
| Recovery time | under 60 min |

No target is “met” until measured in the deployed system.

### 15.3 Degraded modes

- GPT unavailable: verified templates only.
- MCP unavailable: browser remains playable; connector calls return status.
- WebSocket degraded: reconnect then spectate; never locally simulate authority.
- Persistence degraded: stop creating public rooms; finish already committed
  in-memory rounds only if receipt integrity remains available.
- Receipt signer unavailable: label round unverified and do not publish receipt.
- Moderation unavailable: disable new free-text submissions; templates continue.

### 15.4 Incident priority

1. Protect people and credentials.
2. Stop unauthorized mutation and preserve evidence.
3. Maintain truthful state labels.
4. Restore safe bounded play.
5. Reconcile receipts and publish a scoped incident note.

Never silently relabel an unverified round as verified after recovery.

### 15.5 Routine maintenance

- Daily: exceptions, failed receipts, abuse queue, deletion jobs, model fallback
  rate, tick deadline, capacity, certificate/secret expiry.
- Weekly: restore drill sample, dependency advisories, moderation calibration,
  law distributions, room-size balance, accessibility regression review.
- Per release: deterministic replay corpus, threat-model delta, load and chaos
  checks, rollback rehearsal, policy/version review.
- Quarterly: key rotation, access review, retention audit, incident tabletop,
  legal/privacy review, external accessibility session.

## 16. Metrics without manipulation

Primary product measure: percentage of first-time visitors who complete one
round and can correctly answer “what kept the core alive?”

Guardrails:

- time to first light;
- compilation success and safe-template fallback rate;
- round completion and voluntary replay rate;
- real ready-player count and room-size distribution;
- accessibility-mode success parity;
- reports, blocks, disconnects, policy faults, rejected laws;
- shared wins by room size, law, and seed cohort;
- deletion completion and incident/receipt integrity.

Do not optimize raw time-on-site, notification opens, invitations, or loss-driven
retries. Do not train on private strategies by default.

## 17. Build order

### Hackathon slice

1. Browser grid, guest entry, two fixed templates, deterministic 60-second room.
2. Strategy text → GPT-5.6 candidate → deterministic DSL verifier → preview.
3. Two-person distinct-trail repair, one pulse, shared result.
4. Replay hash/receipt and local verifier.
5. Remote MCP tools for join, program, status, pulse.
6. One pre-certified world-law demonstration.
7. Consent, community rules, privacy summary, reporting placeholder, accessible
   modes, and explicit prototype labels.

### Do not spend hackathon time on

Accounts, friends, chat, cosmetics, mobile apps, economic systems, open-ended
law creation, global rankings, or high-scale matchmaking.

## 18. Acceptance proof

The demo is credible only if judges can observe:

- two browser clients and one ChatGPT/Codex controller in the same room;
- different natural-language strategies compiling to visible bounded policies;
- deterministic live play continuing even if the model connection is removed;
- one pulse accepted and a second rejected;
- identical replay result from the public verifier;
- an unsafe strategy and unsafe law rejected for a specific machine-checkable
  reason;
- keyboard/reduced-motion play;
- truthful fallback when GPT or MCP is unavailable.

## 19. Explicit unknowns and release blockers

This document specifies a design. As of 2026-07-18 there is no GRIDWAKE product
implementation in this workspace. Therefore security, fairness, performance,
accessibility, model latency, moderation accuracy, and balance are unproven.

Production is blocked until:

- the operator/legal/privacy placeholders are resolved;
- the actual engine matches the reference vectors in every implementation;
- repo-grounded security review and penetration testing are complete;
- realistic 24-human and 50-synthetic-client tests meet stated thresholds;
- moderation and accessibility receive human evaluation;
- incident, deletion, key, backup, and rollback procedures are exercised;
- game balance is tested with real players, including adversarial groups.
