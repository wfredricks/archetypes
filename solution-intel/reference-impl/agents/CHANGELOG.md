# Changelog

All notable changes to `@solution-intelligence/agents` will be documented in this file.

## 0.2.0-pre — 2026-05-22

Phase 2.5 of the solution-intel reference implementation: PolyGraph backend lifted from contract-loader's adapter pattern. Lifted from `wfredricks/archetypes-solution-intelligence/agents` @ commit `cc6bc8687ee61e17994a65e2f7be92d065155a8f` under tag `solution-intel-reference-impl-2026-05-22d`.

- `Backend` interface + `selectBackend(opts)` adapter — pattern lifted from `contract-loader/src/backends/types.ts` + `select.ts` (Phase 1e). Two implementations: `Neo4jBackend` (preserves the pre-2.5 path) and `PolyGraphBackend` (new, embeds `polygraph-db@^0.1.4` via LevelAdapter).
- New `@adopt:default-backend` marker in `src/backends/types.ts` — the canonical archetype defaults to `'polygraph'`. Adopters running a live Neo4j cluster (the asi adoption is the canonical example) flip the marker to `'neo4j'`.
- `runCompletenessAgent` and `runBookendAuditAgent` accept two new optional fields: `backend?: 'neo4j' | 'polygraph'` and `polygraphPath?: string`. Public function signatures unchanged.
- `Backend.native` extended with `countOutgoingRels(nodeId, types[])` + `countIncomingRels(nodeId, types[])` helpers used by CompletenessAgent's three aggregation sites (rules 5/6/7) on the PolyGraph path. The bridge does NOT grow `OPTIONAL MATCH + WITH + count(...)`; agents pick the right tool per query.
- `tests/backends-differential.test.ts` (new, 13 cases): parametrized via `describe.each` across both backends; Neo4j leg gated on Bolt reachability per the events-spine harness pattern.
- Bumps agent version constants `COMPLETENESS_AGENT_VERSION` / `BOOKEND_AUDIT_AGENT_VERSION` to `0.2.0-pre`.

## 0.1.0-pre — 2026-05-22

Initial release. Phase 1b of the asi adoption.

- `CompletenessAgent` — 7 rules: hypothesis status sweep (open/partial/violated/stale), contract-no-hypotheses, dataobject-orphan, service-no-process. Read-only.
- `BookendAuditAgent` — 6 rules: in-sync, missing-snapshot, hypothesis-added, hypothesis-removed, status-drift, verifiedAt-drift. Read-only on SIG; reads committed snapshot from disk.
- Markdown and JSON formatters for both agents.
- Public surface: `runCompletenessAgent`, `runBookendAuditAgent`, `formatMarkdown*`, `formatJson*`, `Finding`, `AgentReport`, `Severity`, `AgentRunOptions`, `BookendAuditOptions`.
