# events-spine — Adoption Recipe

*How a target project adopts `events-spine` into its own tree. Skeleton form;
populated more concretely by Stage 2d (SI/I adoption) when it runs.*

---

## 1. Pre-adoption check

- Confirm NATS is reachable from the target project. In the constellation,
  this means `udt-m2-nats` (or equivalent) is running and routable.
- Confirm the target project's TypeScript is ≥5.0.
- Confirm the target project has a place for an in-tree `eventing/` module —
  typically `src/eventing/` under the project's main package.

## 2. Derivation

Copy the reference-impl files into the target project under `src/eventing/`:

```
events-spine/reference-impl/src/types.ts             → src/eventing/types.ts
events-spine/reference-impl/src/publisher/           → src/eventing/publisher/
events-spine/reference-impl/src/subscriber/          → src/eventing/subscriber/
events-spine/reference-impl/src/scribe/              → src/eventing/scribe/
```

On every derived file:

- Add a provenance JSDoc header per `../METHODOLOGY.md §Marking conventions`:
  - Source repo: `https://github.com/wfredricks/archetypes`
  - Source commit hash (exact)
  - Source path
  - Pattern: `events-spine` (composite) / `simple-pubsub` / `simple-subscriber`
    / `scribe` (per file)
  - Maintenance ownership: target project's owners
  - Modifications from upstream: list of diffs, or `none — copied verbatim`

- **Archetype-owned (do NOT rename):** class/interface/type/function names
  (`Publisher`, `Subscriber`, `Scribe`, `createPublisher`, `ScribeEvent`,
  `ScribeBackend`, `SubjectFilter`, etc.). Inner config keys. Subject-pattern
  structure (`<service>.<entity>.<action>`).

- **Adopter-owned (rename per project):** subject prefix (e.g. `si.` or `asi.`),
  publisher ids, file paths for the file backend root, env-var prefixes.

## 3. Configuration

Target project supplies:

- `NATS_URL` (or equivalent) — the bus URL
- `publisherId` per service that publishes (informational; not authenticated)
- Scribe backend choice (v0.1.0: file backend only) and `root` path
- Subject filter — defaults to `>` per P1; override only if the adopter has a
  specific reason

## 4. First publisher

Wire one state-changing call to emit an event. For SI/I Stage 2d that is the
post-login `recordLogin()` path emitting `si.identity.login.completed`. The
event payload MUST NOT contain bearer tokens, login codes, or other
credentials (Constraint C5).

> **Trade-off — graceful-no-op vs. propagate.** If your domain treats
> events as **observability** (the audit ledger or DB write is the
> correctness contract; events inform subscribers), wrap `publish` in
> graceful-no-op semantics: catch + log + return. Publisher failures
> must not fail user-facing operations. SI/I (Stage 2d) chose this
> path: NATS unavailable → events disabled, login/grant/revoke still
> work, audit ledger still writes.
>
> If your domain treats events as **part of the correctness contract**
> (e.g. saga participants, distributed transactions), propagate the
> failure: let the caller decide whether to retry, fail closed, or
> compensate. Adopters should make this call explicit per service.

## 5. Verification

Spin up the Scribe with the file backend. Trigger the state change. Verify
that the event appears in `<root>/<today>.jsonl`. Read it back via the MCP
server's `scribe.query` tool.

## 6. Integration test

Add one integration test to the target project's suite that:
1. Boots NATS (or attaches to a running one) and the Scribe with a tmp root.
2. Publishes one event from production code (not via the publisher directly).
3. Asserts the event appears in `scribe.query` output for the configured
   subject filter.

The reference-impl's `tests/integration/_harness.ts` is the model.

## 7. CHANGELOG + FINDINGS

- Target project's `CHANGELOG.md`: record the events-spine adoption with the
  commit pin.
- Target project's `BUILD-STAGE-NN-FINDINGS.md`: capture any defects
  discovered on the way in. Flow them back to
  `archetypes/events-spine/DEFECTS.md` via PR.

🖇️ *Skeleton recipe. To be tightened with concrete steps after Stage 2d's
first run.*
