# Reference implementation pointer

The reference implementation for `scribe` lives in-tree, co-located with the
composite archetype that first needed it:

**`../../events-spine/reference-impl/src/scribe/`**

This includes:
- `scribe.ts` — the main process (Pr1: boot → subscribe → record)
- `backend-protocol.ts` — the `ScribeBackend` contract (S6)
- `backends/file-backend.ts` — the JSONL file backend reference
- `summary.ts` — the daily summary process (Pr2)
- `mcp-server.ts` — the MCP server exposing scribe.query, scribe.tail, scribe.summary
