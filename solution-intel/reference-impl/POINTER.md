# solution-intel Reference Implementation

**Canonical reference: the `wfredricks/solution-intelligence-*` repo family.**

This archetype's reference implementation is distributed across multiple repos because solution-intel is a substrate, not a single library. Each repo is a piece of the substrate.

## Current repos (as of 2026-05-21)

| Repo | Purpose | Tag |
|---|---|---|
| [solution-intelligence-identity](https://github.com/wfredricks/solution-intelligence-identity) | Identity service (simple-auth adoption) | `v0.2.0-pre` |
| [solution-intelligence-cli](https://github.com/wfredricks/solution-intelligence-cli) | Operator CLI for SI | `v0.2.1-pre` |
| [solution-intelligence-graph-client](https://github.com/wfredricks/solution-intelligence-graph-client) | Graph-access library | `v0.1.0-pre` |
| (pending) solution-intelligence-graph | Graph server hosting the project's SIG | Stage 3 |
| (future) solution-intelligence-agents | Working agents over the SIG | Post-Stage-3 |

## Why this archetype predates its registry entry

The SI runtime was being built before the archetypes registry existed, and before `solution-intel` was named as a flagship archetype on 2026-05-21. The bootstrapping has happened once, in the past. The archetype description on this page will be completed when SI is feature-complete.

This is the same pattern as `simple-auth` (where `bangauth` predates the registry) and `simple-ledger` (where `chainblocks` predates the registry) — except `solution-intel` is a *composite* of multiple repos, so the pointer here lists all of them rather than a single library.

## Adoption (sketch)

Full ADOPTION-RECIPE.md is deferred to the full lift. The sketch:

1. Clone the four repos as siblings under the target project's workspace
2. Configure each (NATS URL, graph URL, identity service URL, etc.)
3. Start the substrate (in order: graph → identity → cli)
4. Bootstrap the project's SIG (load ontology, seed initial nodes)
5. Load the project's first archetype contracts into the SIG
6. The target project can now begin composing additional archetypes (events-spine, blackboard, etc.) with their contracts living in the project's SIG

The recipe gets concrete when the substrate is feature-complete and we run it through the archetypes registry's own self-adoption.

🖇️ *Pointer to a multi-repo reference. Full description deferred to full lift.*
