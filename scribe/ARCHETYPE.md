# scribe

*The canonical subscriber. Reporter, not editor.*

---

## Description

`scribe` is the canonical event-recording subscriber. It boots, subscribes to a
configurable subject filter (default `>` — everything), and writes each received
event to a pluggable backend. It exposes an MCP server with three tools —
`scribe.query`, `scribe.tail`, `scribe.summary` — so any MCP-aware agent
(Bhai, OpenClaw sub-agents, future orchestrators) can query the recorded log
without per-project glue. A daily narrative summary is produced via Bedrock/Haiku
and cached (one LLM call per `(subject-filter, date)` per day).

The Scribe is **reporter, not editor**: it records what it hears, it does not
transform, redact, or curate beyond what the subject filter selects. Backends
implement the canonical `ScribeBackend` protocol; swapping backends is a
configuration change, not a code change for anyone who talks to the Scribe.

## When to use

- A constellation, service, or application needs a queryable record of events
  on the bus, accessible from anywhere via MCP.
- You want a daily narrative ("what happened today") without writing one
  yourself.
- You want backend pluggability — start with file (JSONL on disk), move to
  CloudWatch/OpenSearch/loki later without changing the contract surface.

## When NOT to use (anti-triggers)

- **You need event transformation, enrichment, or content-level redaction.**
  That is a separate archetype (a hypothetical `event-curator`). Scribe is
  intentionally not that.
- **You need strict ordering or exactly-once delivery.** Scribe inherits the
  bus's semantics. In v0.1.0 that's NATS-core, lossy by default.

## Composition

This is a primitive archetype; it composes nothing. (Composite archetypes that
include the Scribe — like `events-spine` — bundle it with publisher and
subscriber primitives.)

## Reference implementation

In-tree, co-located with the composite that first needed it:
`../events-spine/reference-impl/src/scribe/`.

See also `./reference-impl/POINTER.md`.

## Adoption recipe

Adoption flows through `events-spine` for now — see
`../events-spine/ADOPTION-RECIPE.md`.

## Known defects

None recorded yet.

## Adopters

None recorded yet.

🖇️ *Part of the events-spine composite. Born 2026-05-21.*
