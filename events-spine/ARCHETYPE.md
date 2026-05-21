# events-spine

*Event-driven communication substrate. Composite archetype.*

---

## Description

`events-spine` is a **composite archetype** that delivers a working eventing
substrate to any adopter. Publishers emit typed events on the bus; subscribers
react to them; a canonical Scribe subscriber records the whole firehose to a
pluggable backend and exposes the recorded log via MCP. NATS is the canonical
bus.

The lived-experience framing is in `STORY.md`: a market square (the bus) where
citizens (publishers and subscribers) shout and listen, and a newspaper reporter
(the Scribe) walks the square with a notepad and files at end of day.

The spec is in `LEFT-BOOKEND.md`. The reference implementation is in
`reference-impl/` (TypeScript canonical). The archetype contract is also
**queryable in the SIG** at `bolt://localhost:7689` as
`Contract {archetypeName: "events-spine", contractId: "events-spine-v0.1.0-pre"}`
under `Solution {namespace: "asi"}`.

## When to use

- A constellation or service needs publishers and subscribers decoupled by a
  shared bus.
- You want a queryable, MCP-exposed record of events from anywhere in the
  constellation without writing your own logger.
- You want a daily "what happened today" narrative without writing your own
  summarizer.
- You want backend pluggability from day one (file → CloudWatch → OpenSearch
  → loki) without coupling consumers to the backend.

## When NOT to use (anti-triggers)

- **Request/response semantics.** Use HTTP or NATS request/reply.
- **Cross-constellation event routing.** Out of scope for v0.1.0; pair with
  a federation archetype later.
- **Strict ordering or exactly-once delivery.** NATS-core is lossy by default;
  v0.1.0 does not include JetStream.
- **Untrusted bus.** Publishers are not authenticated; the bus is assumed
  trusted within the constellation.

## Composition

`events-spine` composes four registry entries:

| Composed | Kind | Role |
|---|---|---|
| `simple-pubsub` | primitive | Publisher (Service S1) |
| `simple-subscriber` | primitive | Subscriber (Service S2) |
| `scribe` | primitive | Canonical recorder + MCP server (Pr1, S3-S6) |
| `mcp-proxy` | meta-pattern | Documentation only — the pattern the Scribe applies |

All four reference implementations live in-tree at `reference-impl/src/`. The
primitive archetype directories carry `POINTER.md` files back to this tree.

## Reference implementation

`./reference-impl/` (TypeScript canonical). See `./reference-impl/README.md`.

## Adoption recipe

`./ADOPTION-RECIPE.md`.

## Known defects

`./DEFECTS.md` (initially empty; populated by Stage 2d adoption).

## Adopters

`./ADOPTIONS.md` (initially empty; populated when SI/I Stage 2d ships).

## Right bookend

`./RIGHT-BOOKEND.md` will be written after Stage 2d adoption. Meanwhile, the
SIG-snapshot at `./RIGHT-BOOKEND-snapshot-2026-05-21.md` captures the
Hypothesis status as of the reference-impl build.

🖇️ *First native composite archetype in this registry. Born 2026-05-21.*
