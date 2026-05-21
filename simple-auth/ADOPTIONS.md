# simple-auth — Adopters

*Projects that have lifted this archetype. Mirrors `ARCHETYPE.yaml#adopters` with
more detail.*

---

| Adopter | Stage | Tag | Date | Notes |
|---|---|---|---|---|
| [`solution-intelligence-identity`](https://github.com/wfredricks/solution-intelligence-identity) | Stage 2a | v0.2.0-pre | 2026-05-20 | Initial bangauth derivation. `constellationId` → `projectId` semantic rename. MFA/recovery/browser-login/NATS/Lambda-handlers/`twin-id` all dropped. Composed with chainblocks audit via `src/audit.ts`. Owner-gate stop-gap shipped as `X-SI-Actor` header (retired in Stage 2b). |
| [`solution-intelligence-identity`](https://github.com/wfredricks/solution-intelligence-identity) | Stage 2b | v0.2.0-pre | 2026-05-20 | X-SI-Actor header retired; `actorFromToken(c)` (Authorization: Bearer + `verifyToken`) replaces `assertedActor(c)` in `grants-http.ts`. Regression test added asserting X-SI-Actor alone is ignored. This adoption *fixed* the known defect; future adoptions inherit the fix. |

## Adoption stage conventions

- **Stage NX** — references the adopter's build-stage discipline (e.g.
  `BUILD-STAGE-02A`). For the SI runtime, see
  `artifacts/si-runtime/identity/build-history/` and
  `artifacts/si-runtime/cli/build-history/`.
- **Tag** — the adopter's released tag (or `untagged` for pre-tag work).
- **Date** — adoption date in ISO YYYY-MM-DD.
- **Notes** — one-line summary of what this adoption did differently or what
  defect-fixes it landed.

## Notes on the SI/I adoption

The `solution-intelligence-identity` adoption was the **first** adoption of any
archetype in this registry, and it predates the registry itself by one day. The
methodology was already running (provenance headers, modifications lists,
findings files) before the registry existed as a separate repo; the registry was
bootstrapped on 2026-05-21 to give the practice a vocabulary and a home.

This means the SI/I adoption's `ARCHETYPE.md`
(`artifacts/si-runtime/identity/ARCHETYPE.md`) was written *before* the registry,
and the registry's `simple-auth/` content was extracted *from* SI/I's
`ARCHETYPE.md`, `ARCHETYPE-COPY-PLAN.md`, `BUILD-STAGE-02A-FINDINGS.md`, and
`BUILD-STAGE-02B-FINDINGS.md`. The two are now kept in sync; refresh-from-upstream
operations update both.

Subsequent adoptions of `simple-auth` (or any archetype) start from this registry
as the authoritative description and only need their adopter-side `ARCHETYPE.md`.
