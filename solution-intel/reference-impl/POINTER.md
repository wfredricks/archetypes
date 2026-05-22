# solution-intel Reference Implementation — In-Tree

**As of 2026-05-22, the reference implementation lives in this directory and is current through Phase 1e.**

See:
- `./identity/` — SI/I identity service (snapshot of `wfredricks/solution-intelligence-identity` @ `0.2.0-pre` + Phase 1a F4 fix lifted 2026-05-22)
- `./cli/` — SI command-line operator interface (snapshot of `wfredricks/solution-intelligence-cli` @ `0.2.1-pre` + Phase 1c additions of `commands/contracts.ts` and `commands/agents.ts` lifted 2026-05-22)
- `./graph-client/` — SI/G typed HTTP client scaffold (snapshot of `wfredricks/solution-intelligence-graph-client` @ `0.1.0-pre`; unchanged in Phase 1c)
- `./agents/` — read-only SIG-walking agents (snapshot of `wfredricks/archetypes-solution-intelligence/agents/` @ `0.1.0-pre`, lifted 2026-05-22)
- `./contract-loader/` — bookend parser + SIG commit/query surface (snapshot of `wfredricks/archetypes-solution-intelligence/contract-loader/` @ `0.2.0-pre`, **backend-pluggable as of Phase 1e**, refreshed 2026-05-22). Default backend in the canonical archetype is **PolyGraph** (via `polygraph-db@^0.1.4`); adopters running an existing Neo4j cluster flip the `@adopt:default-backend` marker to `'neo4j'`. Public function signatures of `commitContract` / `verifyContract` / `listContracts` / `showContract` are unchanged from Phase 1c. Canonical wire type for `Hypothesis.verifiedAt` remains ISO-8601 string at this package's boundary; see `contract-loader/ARCHETYPE.md`.
- `./scripts/` — adoption-level ops scripts (snapshot of `wfredricks/archetypes-solution-intelligence/scripts/` lifted 2026-05-22; adopter values converted to `'@adopt:...'` placeholder literals)

A sixth piece (`./graph/`, the SI/G server) lands at Stage 3.

The original `wfredricks/solution-intelligence-{identity,cli,graph-client}` repos continue to exist as historical artifacts but are no longer the canonical reference. Adopters work from this in-tree copy.

Each subdirectory carries `// @adopt:` markers at every customizable identity-and-deployment value and at every composition site (identity, audit-ledger, eventing, graph, **storage backend**). Run `grep -rn "@adopt:" .` inside any subdirectory to see them all. As of Phase 1e the marker count across `reference-impl/contract-loader/` grows by 1 (`@adopt:default-backend`); other subdirectories are unchanged from the Phase 1c lift.

Source commit for the Phase 1e contract-loader refresh: `3dbc71a2110a3b6a7d5f5422488102c2a4daf4e8` in `wfredricks/archetypes-solution-intelligence` (`main`, post PR #6).

Source commit for the prior Phase 1c lifts (identity, cli, graph-client, agents, scripts): `195096307965d7ccd1a5ddac5da1b09db6b77b60`.

Tag of record for the Phase 1e in-tree lift: `solution-intel-reference-impl-2026-05-22c`. The prior Phase 1c lift was `solution-intel-reference-impl-2026-05-22b`.

🖇️ *Reference implementation, in-tree. Snapshot, not git history; the substrate is the contract, the snapshot is the proof.*
