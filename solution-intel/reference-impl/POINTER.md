# solution-intel Reference Implementation — In-Tree

**As of 2026-05-21, the reference implementation lives in this directory.**

See:
- `./identity/` — SI/I identity service (snapshot of `wfredricks/solution-intelligence-identity` @ `0.2.0-pre`)
- `./cli/` — SI command-line operator interface (snapshot of `wfredricks/solution-intelligence-cli` @ `0.2.1-pre`)
- `./graph-client/` — SI/G typed HTTP client scaffold (snapshot of `wfredricks/solution-intelligence-graph-client` @ `0.1.0-pre`)
- `./agents/` — read-only SIG-walking agents (snapshot of `wfredricks/archetypes-solution-intelligence/agents/` @ `0.1.0-pre`, lifted 2026-05-22)

A fifth piece (`./graph/`, the SI/G server) lands at Stage 3.

The original `wfredricks/solution-intelligence-{identity,cli,graph-client}` repos continue to exist as historical artifacts but are no longer the canonical reference. Adopters work from this in-tree copy.

Each subdirectory carries `// @adopt:` markers at every customizable identity-and-deployment value and at every composition site (identity, audit-ledger, eventing, graph). Run `grep -rn "@adopt:" .` inside any subdirectory to see them all.

Tag of record for the in-tree lift: `solution-intel-reference-impl-2026-05-21`.

🖇️ *Reference implementation, in-tree. Snapshot, not git history; the substrate is the contract, the snapshot is the proof.*
