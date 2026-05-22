# solution-intel Reference Implementation — In-Tree

**As of 2026-05-22, the reference implementation lives in this directory and is current through Phase 1c.**

See:
- `./identity/` — SI/I identity service (snapshot of `wfredricks/solution-intelligence-identity` @ `0.2.0-pre` + Phase 1a F4 fix lifted 2026-05-22)
- `./cli/` — SI command-line operator interface (snapshot of `wfredricks/solution-intelligence-cli` @ `0.2.1-pre` + Phase 1c additions of `commands/contracts.ts` and `commands/agents.ts` lifted 2026-05-22)
- `./graph-client/` — SI/G typed HTTP client scaffold (snapshot of `wfredricks/solution-intelligence-graph-client` @ `0.1.0-pre`; unchanged in Phase 1c)
- `./agents/` — read-only SIG-walking agents (snapshot of `wfredricks/archetypes-solution-intelligence/agents/` @ `0.1.0-pre`, lifted 2026-05-22)
- `./contract-loader/` — bookend parser + SIG commit/query surface (snapshot of `wfredricks/archetypes-solution-intelligence/contract-loader/` @ `0.1.0-pre`, lifted 2026-05-22). Canonical wire type for `Hypothesis.verifiedAt` is now ISO-8601 string at this package's boundary; see `contract-loader/ARCHETYPE.md`.
- `./scripts/` — adoption-level ops scripts (snapshot of `wfredricks/archetypes-solution-intelligence/scripts/` lifted 2026-05-22; adopter values converted to `'@adopt:...'` placeholder literals)

A sixth piece (`./graph/`, the SI/G server) lands at Stage 3.

The original `wfredricks/solution-intelligence-{identity,cli,graph-client}` repos continue to exist as historical artifacts but are no longer the canonical reference. Adopters work from this in-tree copy.

Each subdirectory carries `// @adopt:` markers at every customizable identity-and-deployment value and at every composition site (identity, audit-ledger, eventing, graph). Run `grep -rn "@adopt:" .` inside any subdirectory to see them all. As of Phase 1c the marker count across `reference-impl/` is ≥ 55 (baseline 55 from Phase 1b + new `contract-loader/` and `scripts/` markers from Phase 1c).

Source commit for the Phase 1c lift: `195096307965d7ccd1a5ddac5da1b09db6b77b60` in `wfredricks/archetypes-solution-intelligence` (`main`).

Tag of record for the in-tree lift: `solution-intel-reference-impl-2026-05-22b` (or `-22-cleanup`).

🖇️ *Reference implementation, in-tree. Snapshot, not git history; the substrate is the contract, the snapshot is the proof.*
