# scribe/

Reference implementation for the **`scribe`** archetype. Lives here for
co-location with the composite `events-spine`.

Archetype description: `../../../../scribe/ARCHETYPE.md`

Realizes:
- **Pr1** — `scribe.ts` — boot → subscribe → record
- **Pr2** — `summary.ts` — daily narrative summary (default model:
  Claude Haiku via Bedrock)
- **S3 / S4 / S5** — `mcp-server.ts` — MCP server exposing `scribe.query`,
  `scribe.tail`, `scribe.summary`
- **S6** — `backend-protocol.ts` — the swappable backend contract
- **P1** — default subject filter `>`
- **P2** — canonical `ScribeEvent` format owned by the Scribe; backends adapt
- **P4** — reporter, not editor — no transformation between subscriber and
  backend
- **P5** — MCP surface is the contract; backend is implementation
- **C1** — one LLM summary per `(subject, date)` per day (cache-enforced)
- **C2** — file backend rotates by UTC day
- **C3** — standard MCP protocol via `@modelcontextprotocol/sdk`

Files:
- `scribe.ts` — main process
- `backend-protocol.ts` — `ScribeBackend` interface + helpers
- `backends/file-backend.ts` — JSONL file backend reference
- `summary.ts` — `Summarizer` interface + Bedrock implementation
- `mcp-server.ts` — MCP server
- `index.ts` — re-exports
