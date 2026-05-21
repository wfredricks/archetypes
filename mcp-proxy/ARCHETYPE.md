# mcp-proxy

*Meta-pattern: stable MCP surface in front of a swappable backend.*

---

This is a **meta-pattern**, not a primitive or a composite. It has no reference
implementation of its own; it is a named, documented pattern that other
archetypes apply when they need backend-pluggability without forcing every
consumer to know about the backend.

For the full discussion — what the pattern is, why it matters, where it shows
up, how to apply it, when NOT to apply it, and the Scribe as the first worked
example — see **[`./README.md`](./README.md)**.

## Reference implementation

None. This is documentation only.

The first worked example is the Scribe inside `events-spine` — see
`../events-spine/reference-impl/src/scribe/`. The Scribe exposes a stable MCP
surface (`scribe.query`, `scribe.tail`, `scribe.summary`) in front of a
swappable `ScribeBackend` protocol. The Scribe is the example; this archetype
is the name of the pattern.

🖇️ *Meta-pattern. Born 2026-05-21.*
