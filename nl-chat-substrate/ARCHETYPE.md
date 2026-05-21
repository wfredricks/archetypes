# nl-chat-substrate

*Natural-language chat pipeline: intent extraction, tool routing, response shaping.*

> **STATUS: stub** — this archetype's name is reserved. Full description, recipe,
> defects log, and adopters log will be lifted **when the NL pipeline gets a
> second derivation** — i.e. when a second project lifts the SIG/MCP-style
> natural-language pipeline whole-cloth, demonstrating the pattern is reusable
> and not project-specific.

---

## Description (preview)

A composable natural-language pipeline: text in, intent extraction (LLM call),
typed slots filled, tool-or-graph routing decision, action invocation, response
shaping. Composes other archetypes (typically `simple-auth` for actor identity,
`graph-db` for context loading, an MCP-proxy primitive for tool surface). Most
likely composite, not primitive — the YAML will be `kind: composite` when the
full lift happens.

## Reference implementation

External pointer — see [`./reference-impl/POINTER.md`](./reference-impl/POINTER.md).

Canonical: SIG/MCP and the `polygraph-viz/src/nl/` pipeline (likely
[`wfredricks/sig-mcp`](https://github.com/wfredricks/sig-mcp) plus the
`polygraph-viz` NL surface — exact repo lineage to be confirmed at lift time).

## Trigger condition for full lift

When **the NL pipeline gets a second derivation** — a second project lifts the
SIG/MCP-style pipeline whole-cloth. The current implementation lives in the
`polygraph-viz` repo's `src/nl/` and serves one project; the pattern earns a
formal archetype slot in this registry when it serves two.

Until then, the pattern's vocabulary is reserved here; the implementation lives
in `polygraph-viz`.
