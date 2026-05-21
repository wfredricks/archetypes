---
archetypeName: simple-auth
archetypeKind: primitive
archetypeVersion: lifted-2026-05-20
---

# simple-auth — Left Bookend (Retroactive)

*Reconstructed left-bookend for the `simple-auth` archetype. Written 2026-05-21, after the fact, as part of the bookend-discipline rollout. The original work (bangauth → SI/I Stage 2a) happened 2026-05-20 without a formal left bookend.*

*This document attempts to capture what we WOULD have committed to if the bookend discipline had been in place at lift time. It is honest about being a reconstruction; where I cannot recover original intent, I name the gap.*

---

## Status

**Retroactive.** The work this bookend describes is already done. The companion `RIGHT-BOOKEND.md` describes what actually happened. The asymmetry — right-bookend grounded in evidence, left-bookend reconstructed from artifacts — is the cost of starting the discipline late. Going forward, native archetypes get their left bookends *before* code, the way `events-spine` did.

The methodological lesson is captured here so the cost is not paid silently: **retroactive left bookends are a regression-recovery exercise, not the discipline working as intended.** Reading this document with that caveat is correct.

---

## Scope (reconstructed)

`simple-auth` is the **passwordless email-and-code authentication pattern**, lifted into the registry from the working `wfredricks/bangauth` library. The library predates the registry; bringing the reference implementation in-tree would have served no methodology purpose and would have broken the existing library's release process.

**In scope for the lift (Stage 2a):**
- Derive bangauth's core into `solution-intelligence-identity`
- Mark every adapted file with JSDoc provenance headers per (the then-emerging) marking convention
- Document the adoption recipe sufficiently for future adopters
- Ship `v0.2.0-pre` of SI/I as the first adoption

**Out of scope for the lift:**
- Modifying bangauth itself (the library is upstream; the lift is downstream)
- Recovery flows (deferred to v0.2 of SI/I)
- Email delivery (bangauth's email module pulls in AWS SDK; SI/I deferred to `_deferred/`)

## Principles (reconstructed)

These are the normative postures we would have committed to, named explicitly. None of them were written down at lift time; all are reconstructable from the resulting code and ARCHETYPE.md.

### Principle P1: Passwordless by design

> Authentication relies on email-of-record + deterministic short-lived codes. No password database exists, therefore no password store can be breached.

**Driver:** Compliance scope reduction (no NIST 800-53 IA-5 password-management burden), operational simplicity (no password-reset flow), user-experience preference (no password fatigue).

**Consequences:**
- Email delivery becomes a hard dependency; if it fails, login fails. The lift accepted this trade-off.
- The code derivation is *deterministic* (HMAC of email + month + secret) rather than randomly stored — eliminates the database of one-time codes.

### Principle P2: Local token verification

> Services that share the HMAC key store can verify tokens without a network call back to the identity service.

**Driver:** Latency, blast-radius reduction (identity service can be down without blocking authenticated reads), composition (composite archetypes can mount auth verification anywhere).

**Consequences:**
- The HMAC key store must be propagated to every peer that verifies tokens.
- Token revocation is *not* immediate (there is no central blacklist check); revoked tokens remain valid until the month-key rotates. This is an accepted trade-off; if hard-immediate revocation is required, this archetype is the wrong choice.

### Principle P3: Audit-as-append-only

> Every state change (account lifecycle event, code issuance, token verification, grant, revoke) is emitted to an append-only audit ledger.

**Driver:** Auditability (cATO / FedRAMP-style review), tamper-evidence, ability to reconstruct history without database introspection.

**Consequences:**
- A `simple-ledger` (chainblocks) implementation is the canonical audit emitter. A JSONL fallback exists for development.
- The audit emitter is *pluggable*. The auth code does not depend on a specific ledger implementation; it depends on an emitter interface.

### Principle P4: Compose-readiness from day one

> The archetype exposes its router as a mountable component AND exposes accessors for its key store + config so peer services can verify tokens locally.

**Driver:** Anticipated composition into a future `secure-web-app` archetype. Build the seams now so the composition is mechanical later.

**Consequences:**
- The router does not assume a URL prefix. Adopters mount at `/auth`, `/identity`, `/api/v1/auth`, or wherever.
- The key store is exported, not encapsulated. Peer services import it.

### Principle P5: Adopter-side fixes flow back as defects

> Anything an adopter has to change to make the archetype work cleanly in their context becomes a documented defect — to be fixed upstream when feasible, or documented for the next adopter to inherit.

**Driver:** Methodology discipline. Adoptions teach the archetype things; the registry remembers.

**Consequences:**
- Stage 2a discovered the X-SI-Actor header anti-pattern → DEFECTS.md captured it
- Stage 2b retired the X-SI-Actor shortcut → DEFECTS.md updated with remediation
- Stage 2a discovered an unused `createHmac` import → DEFECTS.md captured it (flagged for upstream)
- Stage 2a found the `email.test.ts` testing template concepts rather than the actual builder → DEFECTS.md captured the structural recommendation

This principle is what turns adoption from a one-way derivation into a two-way refinement loop. It was implicit during Stage 2a; it should have been explicit. Writing it down here.

## Constraints (reconstructed)

### C1: TypeScript reference

The reference implementation is TypeScript. (At the time of the lift, the registry's reference-language commitment was not yet documented; it was a de facto choice. Now formally documented in METHODOLOGY.md §Reference language.)

### C2: Monthly key rotation with 3-day grace window

Codes and tokens are HMACs derived per-month. A new month rotates the key. The previous month's key is honored for 3 days into the new month to handle requests in flight. After day 4, previous-month tokens are invalid.

### C3: No password storage

C1's restatement at the credential layer: this archetype MUST NOT store anything that resembles a password, even hashed. The hash function is per-request (HMAC of email + month + secret), not per-user.

### C4: Email-delivery pluggable

The email adapter is an interface. Reference implementation provides AWS SES + a console adapter for development. Adopters can supply SMTP, Postmark, SendGrid, or any other adapter that conforms.

### C5: Audit-emitter pluggable

Parallel to C4. The audit ledger is an interface. Canonical is chainblocks; JSONL fallback exists.

## Services (the contract surface)

Six services were committed (reconstructed from bangauth's exports + SI/I's usage). Item form added 2026-05-21 to match the canonical bookend shape used by `events-spine`.

### S1: `requestCode(email)`

Issues an HMAC code derived from `(email, month, key)`, dispatches to the email adapter.

### S2: `verifyCode(email, code)`

Verifies the code; returns a bearer token on success.

### S3: `verifyToken(token)`

Verifies a bearer token locally using the shared key store. No network call to the identity service.

### S4: `grants` (HTTP router)

Mountable Hono router for grant/revoke endpoints. Adopters mount under any prefix.

### S5: `getAuthKeyStore()` / `getConfig()`

Accessors exported for peer services that need to verify tokens locally.

### S6: Audit emitter interface

Pluggable contract for the ledger backend (chainblocks canonical; JSONL fallback for dev/tests).

## DataObjects

Named as DataObjects retroactively (the SIG ontology did not have DataObject at lift time — see the SIG ArchiMate ontology backlog item).

### DO1: `AuthCode`

Shape: `{ email, code, expiresAt }`. Per-request HMAC; no persistent code database.

### DO2: `Token`

Opaque string; HMAC over `(email, month, key)`; verifiable locally given the shared key store.

### DO3: `Grant`

Shape: `{ subject, principal, action, resource, audit_block_seq }`. Stored append-only via the audit emitter.

### DO4: `AuditEntry`

Append-only, sequence-numbered ledger entry emitted on every state change.

These were not formally named as DataObjects at lift time (the SIG ontology didn't have DataObject yet — see the SIG ArchiMate ontology backlog item for tonight's work). They are named now.

## Hypotheses (reconstructed; what we WOULD have committed to)

If we had written this left bookend before Stage 2a, these would have been the hypotheses for the (then-still-future) right bookend to test:

1. **The five Principles (P1-P5) survive implementation.** We commit to passwordless, local verification, append-only audit, compose-readiness, and adopter-side-fix discipline.
2. **The five Constraints (C1-C5) are enforced.** TypeScript only, monthly key rotation with grace, no password storage, pluggable email, pluggable audit.
3. **The six Services are exposed cleanly.** The router mounts under any prefix; peers can verify tokens locally; the audit interface is pluggable.
4. **The lift takes ≤1 day of focused work for the first adoption.** Sub-agent execution against a recipe file.
5. **Defects discovered during Stage 2a flow back into DEFECTS.md** with remediation status.
6. **Future composite archetypes can compose simple-auth without modification.** The composition seams (router mount, key store accessor, audit interface) are sufficient.

The right bookend evaluates each. The companion `RIGHT-BOOKEND.md` does this with hindsight.

## What this retroactive bookend cannot recover

Two things would have been valuable to commit *before* the work but cannot be recovered now:

1. **The alternatives considered.** A real left bookend names what was ALMOST chosen and why it was rejected. Reconstruction loses this; the comparison was made in the lift but is not in any artifact I can find. Future left bookends MUST capture rejected alternatives at the time of the decision.

2. **The scope of in-scope-but-deferred.** The lift made several deferral decisions (recovery flows, email module, etc.). Some were documented; others were judgment calls made during the work. A pre-work left bookend would have listed them explicitly so the right bookend could check "was every deferred item still deferred, or did scope creep happen?"

This is what a retroactive bookend can't do. It is the cost we pay for not starting the discipline until lift 2 (events-spine). The reconstruction here is *enough* to give the right bookend something to compare against, but it is not as good as a pre-commit would have been.

## Methodological note

The decision to write this retroactive left bookend is itself instructive. We are paying a one-time cost to back-fill what should have been there from the start. Future archetypes (events-spine and beyond) do NOT pay this cost — they get left bookends before code.

If we had instead said "leave simple-auth without a left bookend; we'll know from events-spine onward whether the discipline pays off," we'd save the back-fill cost but lose the apples-to-apples comparison between bookend-disciplined archetypes and pre-discipline archetypes. The choice to back-fill is a choice to make the comparison possible.

🖇️ *Retroactive left bookend by Bhai, 2026-05-21. Reconstructed from artifacts; honest about what could and could not be recovered.*
