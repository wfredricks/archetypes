# graph-db

*Property-graph store with typed nodes, typed edges, and pluggable persistence.*

> **STATUS: stub** — this archetype's name is reserved. Full description, recipe,
> defects log, and adopters log will be lifted **when polygraph gets a real
> derivation case** — i.e. the first formal adoption of polygraph under the
> recipe-file build discipline (planned post-Stage-3 in the SI runtime sequence).

---

## Description (preview)

A property graph: typed nodes, typed edges, attributes on both, indexed by node
and edge type. Pluggable persistence (memory, JSONL, Neo4j-backed). The
`graph-db` archetype is the substrate beneath every SI graph operation —
solution intelligence graphs, requirements graphs, traceability graphs — and is
intended to be the building block for `solution-intelligence-graph-client`'s
typed-client surface.

## Reference implementation

External pointer — see [`./reference-impl/POINTER.md`](./reference-impl/POINTER.md).

Canonical: [`wfredricks/polygraph`](https://github.com/wfredricks/polygraph).

## Trigger condition for full lift

When **polygraph gets a real derivation case** — the first adoption that lifts
polygraph source whole-cloth into an SI service (or similar adopter) under the
recipe-file build discipline. The SI/G work begun under
`solution-intelligence-graph-client` v0.1.0-pre is *scaffold only* (per Stage 2c
findings); the first real lift happens in Stage 3 proper.

When that happens, this directory gets the full archetype document set the same
way `simple-auth/` was populated from SI/I.
