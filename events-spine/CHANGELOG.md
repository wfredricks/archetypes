# Changelog

## [Unreleased]

**Phase 1a polish batch.** See [`artifacts/si-runtime/BUILD-PHASE-1A-PLAN.md`](../../si-runtime/BUILD-PHASE-1A-PLAN.md).

### Changed

- **`reference-impl/tests/integration/_harness.ts`** — `hasNatsOption()` gains a CI-aware guard: on GitHub Actions runners (`CI === 'true'`) with no local NATS server reachable, the function returns `false` so `describe.skipIf` lets the integration suite skip cleanly instead of red-failing on Docker-NATS race conditions. Lifted from SI/I Stage 2d (the first adopter); future adopters now inherit the behavior. Behavior unchanged for local development (no `CI` env var). **F2**.
- **`ADOPTION-RECIPE.md`** §"4. First publisher" — added a `> Note:` callout documenting the graceful-no-op vs. propagate trade-off for publisher failures, sourced from Stage 2d FINDINGS. **F5**.

## 0.1.0-pre — 2026-05-21

Initial release. Reference implementation in TypeScript.

- Publisher (simple-pubsub primitive reference) — Service S1
- Subscriber (simple-subscriber primitive reference) — Service S2
- Scribe (canonical subscriber) with file backend — Process Pr1, Service S6
- Scribe MCP server — Services S3 (`scribe.query`), S4 (`scribe.tail`),
  S5 (`scribe.summary`)
- Daily narrative summary via Bedrock/Haiku — Process Pr2
- mcp-proxy meta-pattern documented
- Composition declared in `ARCHETYPE.yaml`
- `ADOPTION-RECIPE.md` skeleton committed
- Hypothesis status written back to the SIG (snapshot in
  `RIGHT-BOOKEND-snapshot-2026-05-21.md`)

55 tests green (51 unit + 4 integration). Integration test exercises the
real NATS round-trip: publish → Scribe captures → backend query returns
the event (H5).

**First native (in-tree) composite archetype in this registry.** Built
forward — STORY → LEFT-BOOKEND → SIG load → BUILD-RECIPE → reference-impl —
under the discipline outlined in `../METHODOLOGY.md §Bookends`.

Adoption pending: SI/I Stage 2d.
