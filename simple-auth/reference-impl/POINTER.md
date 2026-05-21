# simple-auth — Reference Implementation

**Canonical reference: [`wfredricks/bangauth`](https://github.com/wfredricks/bangauth)**

Pinned commit for the first adoption: `3ae510649b2450c71099ab1e43d9350bc11d7087`
(bangauth v0.1.1).

---

## Why an external pointer, not in-tree code

This archetype **predates the archetypes registry**. The `bangauth` repository was
already a working library with a working adopter
(`solution-intelligence-identity`) before this registry existed; bringing the
source in-tree would have:

1. Forked the library's release process without any methodology gain.
2. Broken the existing upstream-refresh discipline that pinning-by-commit already
   gives the SI/I adoption.
3. Created confusion about which copy is canonical — the in-tree copy or the
   upstream repo that adopters already cite.

The registry's job for `simple-auth` is to host the **description**, **recipe**,
**defects log**, and **adopters log** of the pattern. The library code stays
where it already lives.

Future archetypes built *after* 2026-05-21 default to **in-tree** reference
implementations under `reference-impl/`. The first in-tree archetype will be
`events-spine`, built in the step (c) build that follows this bootstrap. New
archetypes ship their reference implementation as code in this repository against
the registry's discipline (provenance, marking conventions, defects discipline,
maintenance ownership).

## Alternative library instances

`simple-auth` is the *pattern*; `bangauth` is one *library instance* of the
pattern. If other libraries appear that satisfy the same contract — for example a
Python `pyauth` library or a Go `bangauth-go` — they would be listed here as
alternative reference implementations. None exist as of this registry's
bootstrap.

The contract a satisfying library must meet:

- **Routes (or equivalent):**
  - `POST /auth/request-code` — accept an email; emit a deterministic
    short-lived code via the email adapter.
  - `POST /auth/verify-code` — accept (email, code); on success return
    `{ authenticated: true, email, token }`.
  - `GET /auth/.well-known/jwks.json` (optional but recommended) — expose the
    public verification material for peer services that verify tokens
    locally.
- **Token shape:** HMAC-signed payload including (email, domain, month, kid,
  alg, version, plus your scope-concept field). Monthly key rotation with at
  least a 3-day cross-month grace period.
- **Adapters interface:** pluggable email, key-store, and user-store
  adapters so the same library serves dev (console email), test (memory
  stores), and production (SES + persistent stores).
- **Audit emission:** the library may emit audit events via NATS (bangauth's
  default) or via a substitutable interface (the adopter's audit substrate).
  Hardcoding NATS is acceptable for the library; the adoption recipe drops it.

If a new library meeting this contract appears, open an issue (or PR) against
this registry adding it as an alternative reference implementation, with the
library's own provenance, refresh policy, and defects-log link.
