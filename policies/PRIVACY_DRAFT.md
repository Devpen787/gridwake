# GRIDWAKE Privacy Notice — Draft Data Contract

Effective date: `[NOT SET]`  
Controller/operator: `[LEGAL ENTITY AND ADDRESS]`  
Privacy contact: `[CONTACT]`

> This is a field-and-flow specification for legal and engineering review, not a
> finished privacy notice or legal advice. Replace every bracketed item and
> verify the implementation before publication.

## 1. Design commitments

- Guest-first; no account required for prototype play.
- No advertising or sale of personal data.
- No training on private strategy text by default.
- No collection of OpenAI passwords, full conversations, address books, precise
  location, government IDs, payment data, or biometric data.
- Separate raw user text, gameplay receipts, security logs, and aggregate
  analytics by purpose and access.
- Retention is finite, field-specific, and enforced by deletion jobs.
- Public replay sharing is explicit and produces a redacted copy/link.

## 2. Data inventory

The final notice SHALL replace targets with confirmed production values.

| Data | Purpose | Visibility | Prototype retention target | Required? |
|---|---|---|---:|---|
| random guest session ID | session, consent, reconnect | operator | 24 h after last use | yes to play |
| neutral callsign and room capability | room participation | room/operator | round + reconnect window | yes |
| terms/rules version, time, locale | prove required acceptance | operator | `[LEGAL DECISION]` | yes |
| age-18 affirmation result | eligibility enforcement | operator | `[LEGAL DECISION]`; do not store DOB | yes |
| strategy text | compile, moderation, author preview | author/restricted operator | delete within 24 h | yes if custom strategy |
| compiled DSL and policy hash | run and verify round | room receipt/operator | room replay: 7 d; redacted receipt as disclosed | yes |
| law proposal text/status | moderate, certify, display | private until certified; then public | failed: 7 d; certified/change log: `[DECISION]` | optional |
| pulse/action events | authoritative game and replay | room/replay | 7 d unless shared/incident | yes |
| receipt inputs, hashes, signature | verification and integrity | room or explicitly public | 7 d room default; public until revoked/expiry | yes |
| truncated/derived network and device security data | abuse, reliability, incident response | restricted operator | 7–30 d based on field | necessary interest/security |
| report/appeal content and evidence | safety and due process | restricted moderators | `[CASE SCHEDULE]` | optional |
| OAuth provider and opaque subject mapping | connected-client authorization | restricted operator | until disconnect + security window | optional |
| aggregate non-identifying metrics | balance, reliability, accessibility | operator | `[SCHEDULE]` | optional/legitimate basis review |
| optional analytics identifier | product analytics | operator/vendor | `[SCHEDULE]` | no; consent where required |

Never put raw strategies, OAuth subjects, IPs, report text, or credentials in a
public receipt. Do not put user text in unrestricted logs.

## 3. How data is used

- provide rooms, compile policies, apply actions, reconnect, and show results;
- moderate text, enforce rules, investigate abuse, and handle appeals;
- sign and verify disclosed gameplay receipts;
- maintain reliability, diagnose faults, prevent fraud and attacks;
- satisfy access, deletion, legal, security, and incident obligations;
- analyze aggregate game balance only within the disclosed purpose and basis.

No materially new purpose is added silently. AI provider use, retention, and
training settings must be contracted/configured and described accurately.

## 4. Legal bases and regional rights

`[COUNSEL: map each purpose and data field to contract, legitimate interests,
consent, legal obligation, vital interests, or other applicable basis; document
balancing tests and country-specific bases.]`

Depending on location, a person may have rights to information, access, copy,
correction, deletion, restriction, objection, portability, consent withdrawal,
or complaint to a regulator. The production notice must identify applicable
rights, verification steps, response timing, and regulator details without
overpromising rights that do not apply.

## 5. AI and supported OpenAI clients

- Strategy/law text may be sent to the configured OpenAI API for compilation or
  analysis after moderation and minimization.
- The model's candidate output is parsed and deterministically verified before
  gameplay use.
- Connecting ChatGPT or Codex sends only the MCP tool inputs necessary for the
  requested room action. GRIDWAKE does not receive an entire conversation unless
  the client explicitly provides content as a tool argument.
- OAuth tokens are encrypted, scoped, rotated/revoked, and inaccessible to the
  game engine. Provider, API mode, data controls, region, and retention must be
  confirmed and listed before launch.

## 6. Sharing and subprocessors

Data may be shared with contracted hosting, database, observability, security,
moderation, email/support, and AI providers only for stated purposes; with
authorities when legally required; or during a legitimate corporate transaction
subject to safeguards.

`[INSERT current provider/subprocessor list, country, service, data categories,
transfer mechanism, and link to updates.]`

We do not sell personal data or share it for cross-context behavioral advertising.
`[COUNSEL: confirm definitions and opt-out requirements by jurisdiction.]`

## 7. Public and room-visible data

Other room participants can see a generated callsign/light, presence, accepted
pulse effect, and aggregate result. Raw custom strategy is private by default.
A certified world-law proposal and redacted receipt may become public as clearly
shown before submission/sharing.

Public recipients may copy disclosed information. Revoking our link stops future
access through that link but cannot recall independent copies.

## 8. Retention and deletion

Retention jobs run at least daily and produce auditable counts without preserving
deleted content. Deleting a session revokes capabilities immediately and removes
eligible primary-store data within `[TARGET]`. Encrypted backups expire through
normal rotation within `[TARGET]`; they are isolated from routine use.

Narrow holds may preserve data needed for security, fraud, disputes, legal duties,
or protecting people. The request status distinguishes received, identity proof
needed, primary deletion complete, backup pending, complete, and exception hold.

## 9. Security

Controls should include encrypted transport and storage, least privilege,
separate admin authentication with MFA, secret/key rotation, scoped OAuth,
dependency and code review, rate limiting, event integrity, backups, monitoring,
incident response, and tested deletion. No security measure eliminates all risk.

To report a vulnerability, use `[SECURITY POLICY AND CONTACT]`, not a public room
or general strategy field.

## 10. Children

The prototype is intended only for adults 18+. We do not knowingly offer
prototype play to children. If we learn that we collected data from an ineligible
minor, we will restrict access and follow an appropriate deletion/parental and
legal process.

`[COUNSEL: an age statement is not enough by itself; assess whether content,
audience evidence, actual knowledge, age screening, and jurisdictions trigger
additional obligations before launch.]`

## 11. International transfers

`[INSERT hosting locations, transfer destinations, adequacy decisions, standard
contractual clauses or other safeguards, and how to request a copy.]`

## 12. Cookies and local storage

Essential storage supports terms versions, opaque guest session, room reconnect,
security, accessibility settings, and device-scoped blocks. Non-essential
analytics/marketing storage, if introduced, remains separate, off until valid
choice where required, and revocable without gameplay loss.

Publish a table of every key/cookie, provider, purpose, type, and expiry.

## 13. Changes and contact

Material changes receive a visible summary and effective date and, where
required, renewed choice. Previous versions remain accessible.

- Privacy contact: `[CONTACT]`
- Data protection officer/representative: `[IF APPLICABLE]`
- Supervisory authority: `[IF APPLICABLE]`
- Request form: `[URL]`

