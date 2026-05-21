# simple-auth

*Email-code authentication with short-lived codes and bearer tokens.*

---

## Description

`simple-auth` is the passwordless email-and-code authentication pattern. The user
enters their email address; the server issues a deterministic short-lived code
derived from `HMAC(email + month + secret)`; the user posts the code back; the
server verifies it and returns a bearer token. No password database. No
external identity provider required. The token is verified locally by any service
that shares the HMAC key store; key rotation is built into the derivation (monthly
key with a 3-day cross-month grace period).

State changes — account lifecycle events, code requests, code verifications — are
emitted as append-only audit entries. The audit emitter is pluggable; the canonical
implementation pairs `simple-auth` with `simple-ledger` (chainblocks) for an
auditable trail, but a JSONL fallback works for development and tests.

The pattern is **compose-ready**. It exposes a router that mounts under any URL
prefix and exports its key store + config as accessors so peer services can verify
tokens locally without going back to the auth server. Composite archetypes that
need authentication (e.g. a future `secure-web-app` archetype) will compose
`simple-auth` directly.

## When to use

- Small-to-medium applications where you control email delivery (or can plug in a
  pluggable email adapter — SES, SMTP, console for dev).
- Use cases where users tolerate code-based login (no password fatigue, no
  password-reset flow to support).
- Environments where you need to verify tokens locally across multiple services
  without a network call back to the identity service (the HMAC key store
  supports this directly).
- Compliance regimes that benefit from passwordless flows: NIST 800-53's IA-2 and
  IA-5 controls are satisfied by the monthly-key + email-loop design without a
  password store to protect (or breach).
- Projects that prioritize ATO / FedRAMP scope reduction by minimizing
  third-party identity-provider integrations.

## When NOT to use (anti-triggers)

- **Password mandates.** If your compliance framework requires password-based
  authentication, this archetype is not it.
- **SSO is non-negotiable.** If the org policy is "SAML or OAuth to the corporate
  IdP, no exceptions," compose differently.
- **Massive-scale stateless deployments where stateless JWT is preferred.** This
  pattern has shared HMAC state (the key store) by design. JWT-with-rotating-JWKS
  is a different shape.
- **Email delivery is unreliable in your context.** If your users can't receive
  email within a few minutes, the code-loop fails by design.
- **You need account-recovery flows out of the box.** Recovery is a separate
  concern; the bangauth reference implementation has a `recovery.ts` module but
  the first adoption (SI/I v0.1) deferred it to v0.2. Don't pick this archetype
  if recovery is day-one.

## Composition

This is a **primitive** archetype; it composes nothing. It is a building block
for composite archetypes (a future `secure-web-app` archetype will likely compose
`simple-auth` + `events-spine` + a session layer; the events spine work begins in
the next build step after this registry was bootstrapped).

## Reference implementation

**External pointer** — see [`./reference-impl/POINTER.md`](./reference-impl/POINTER.md).

The canonical reference implementation is [`wfredricks/bangauth`](https://github.com/wfredricks/bangauth),
pinned at commit `3ae510649b2450c71099ab1e43d9350bc11d7087` (v0.1.1).

This archetype **predates the registry**. The bangauth library was already running
in production before the registry existed; bringing it in-tree would have served no
methodology purpose and broken the existing library's release process. Future
archetypes built *after* 2026-05-21 default to in-tree reference implementations
under `reference-impl/`.

## Adoption recipe

See [`./ADOPTION-RECIPE.md`](./ADOPTION-RECIPE.md) for the full mechanical recipe.
High level:

- **Pin** upstream at an explicit commit (not a tag — tags are mutable).
- **Vendor** the source files into the adopter's `src/auth/` (or equivalent).
  Verbatim where possible; documented modifications where necessary.
- **Apply** the SI/I-style modifications: semantic field renames (e.g.
  `constellationId` → your adopter's scope concept), env-var prefix rename, user-
  facing string updates, route surface reduction to what your adoption actually
  uses, drop the upstream Lambda handlers if you're using Hono (or vice versa).
- **Compose** with audit (chainblocks, or your audit substrate) and any peer
  services that need to verify tokens locally (mount the JWKS endpoint).
- **Walk** [`./DEFECTS.md`](./DEFECTS.md) and fix what applies or document knowing
  acceptance in your adopter `ARCHETYPE.md`.
- **Write** the adopter's `ARCHETYPE.md` declaring provenance, modifications,
  refresh policy, maintenance ownership, and controls satisfied.

## Known defects

See [`./DEFECTS.md`](./DEFECTS.md) for the full list. Key defects every new
adopter must address:

- **`X-SI-Actor` header shortcut bypasses token verification.** The initial SI/I
  Stage 2a adoption shipped with `assertedActor(c)` reading an `X-SI-Actor`
  header to identify the acting user, bypassing token verification. Stage 2b
  retired the shortcut in favor of `actorFromToken(c)` (Authorization: Bearer +
  `verifyToken`). New adopters MUST NOT carry the `X-SI-Actor` shortcut into
  production; use token-derived actor from day one.
- **Unused `createHmac` import in `adapters/memory-key-store.ts`.** Caught by
  SI/I's `noUnusedLocals`. Trivial; remove the unused import in your adaptation.
- **`email.test.ts` does not import `email.ts`.** Real coverage gap — the
  upstream test exercises template concepts via inline strings instead of the
  real builder. Plan to extract `buildTokenEmail` / `buildRejectionEmail` from
  `email.ts` into a pure module so the test can actually cover it.
- **Naming collision: `keys-memory.ts` and `memory-key-store.ts` both export
  class `MemoryKeyStore`.** The first is a production adapter; the second is a
  test fixture. They are not drop-in compatible. Keep both in your adaptation
  (the test fixture is load-bearing for `token.test.ts`) and rename the test
  fixture's export locally if your linter is strict.
- **Module-scope singleton capture in `auth/server.ts`.** Upstream constructs
  `_config`, `_keyStore`, `_userStore`, `_emailAdapter` at module-load time. In a
  test harness that sets env vars in `beforeAll`, the singletons capture the
  pre-set values. Convert to lazy accessors that read env on first call and
  expose a `_resetAuthSingletonsForTests` helper.

## Adopters

See [`./ADOPTIONS.md`](./ADOPTIONS.md) for the full log. Current adopters:

- **`solution-intelligence-identity`** (Stage 2a, v0.2.0-pre, 2026-05-20) —
  initial bangauth derivation. Renamed `constellationId` → `projectId`. Dropped
  MFA, recovery, browser-flow login, NATS publisher, Lambda handlers, `twin-id`.
  Composed with chainblocks-backed audit via `src/audit.ts`. Owner-gate stop-gap
  shipped as `X-SI-Actor` header (see Stage 2b).
- **`solution-intelligence-identity`** (Stage 2b, v0.2.0-pre, 2026-05-20) —
  X-SI-Actor header retired in favor of token-derived actor (`actorFromToken`
  pattern from `/resolve`). Regression test added asserting X-SI-Actor alone is
  ignored. This adoption *fixed* the known defect; future adoptions inherit the
  fix.
