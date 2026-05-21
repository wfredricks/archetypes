# Changelog

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
