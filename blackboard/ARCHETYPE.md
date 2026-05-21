# blackboard

*Shared workspace for multi-agent collaboration on a partially-specified problem.*

> **STATUS: stub** — this archetype's name is reserved. Full description, recipe,
> defects log, and adopters log will be lifted **when the first blackboard
> library exists**. As of this registry's bootstrap (2026-05-21), no library
> instance has been built — only the conceptual pattern, sketched in various
> twin / constellation design documents.

---

## Description (preview)

A blackboard is a shared, structured workspace where multiple agents (human or
machine) collaborate on a partially-specified problem by reading the current
state, contributing their piece, and watching for changes from peers. The
canonical AI use of the pattern dates back to Hearsay-II (1980); the
declarative-software application is multi-agent code generation,
solution-intelligence graph collaboration, and conversational design sessions
where a constellation of agents need to coordinate without a central planner.

The pattern is anticipated to compose `graph-db` (for the structured state) and
`events-spine` (for the change-notification fabric), but the precise composition
will be determined when the first library lands.

## Reference implementation

**None yet.** No `reference-impl/POINTER.md` because no library exists. When the
first library is built, this directory gets either a `POINTER.md` (external repo
that predates being in-tree) or an `in-tree` reference implementation under
`reference-impl/` (preferred for new builds).

## Trigger condition for full lift

When **the first blackboard library exists**. This will likely be in-tree
under `reference-impl/` since it's a new build, not a lift of pre-existing
code. The composition story (probably `graph-db` + `events-spine` + something
agent-specific) will be locked in at that point.

Until then, the name is reserved so future composite archetypes can refer to
`blackboard` without ambiguity.
