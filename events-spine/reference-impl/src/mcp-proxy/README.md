# src/mcp-proxy/

This directory carries the in-tree pointer to the **`mcp-proxy`** meta-pattern.
The meta-pattern itself has no code; its home is at
`../../../../mcp-proxy/README.md`.

The first worked example of the pattern in this archetype is the Scribe — see
`../scribe/mcp-server.ts`. The Scribe exposes a stable MCP surface
(`scribe.query`, `scribe.tail`, `scribe.summary`) in front of a swappable
`ScribeBackend` protocol.

Future archetypes that need backend-pluggability cite `../../../../mcp-proxy/`
rather than reinvent the pattern.
