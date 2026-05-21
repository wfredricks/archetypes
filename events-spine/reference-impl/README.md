# events-spine — reference implementation (TypeScript)

This is the canonical TypeScript reference for the `events-spine` composite
archetype. The Principles, Constraints, Services, Processes, and DataObjects
this implementation realizes are declared in **`../LEFT-BOOKEND.md`** and
**queryable in the SIG** as the `events-spine` Contract anchored to the `asi`
Solution root.

## What lives here

- `src/publisher/` — `simple-pubsub` primitive (publisher) — realizes Service S1
- `src/subscriber/` — `simple-subscriber` primitive (subscriber) — realizes Service S2
- `src/scribe/` — `scribe` primitive: main process (Pr1), backend protocol (S6),
  file backend, daily summary (Pr2), MCP server (S3 + S4 + S5)
- `src/mcp-proxy/` — documentation pointer (the meta-pattern lives in
  `../../mcp-proxy/`)
- `tests/unit/` — pure unit tests (NATS mocked, backend mocked, Bedrock mocked)
- `tests/integration/` — end-to-end with a real NATS server
- `examples/` — runnable, not under test — small programs that demonstrate use

Each source file carries a JSDoc header per `../../METHODOLOGY.md §Marking
conventions`. Each header cites the SIG keys (P1-P5, C1-C5, S1-S6, Pr1-Pr2,
DO1-DO2) the file realizes.

## Tests are contract-intent

These tests are written to be **translatable**. They use only the public API of
each module. They do not assert about internal field names, mock arrangements,
or wire format that would not survive translation to Go/Python/Rust. When this
archetype gets a Go reference, the test suite gets translated alongside the
code.

If you find yourself wanting to add a test that reaches into a private detail,
ask whether the public surface needs to expose that detail instead.

## Quick-start

```bash
npm install
npm run typecheck
npm run lint
npm test
```

`npm test` runs both unit and integration suites. Integration tests need a
NATS server reachable; the harness in `tests/integration/_harness.ts` brings
one up via `docker run` and tears it down afterwards. If Docker is not
available, integration tests skip with a recorded reason.

## Running the Scribe locally

```bash
npx tsx src/scribe/scribe.ts --backend=file --root=/tmp/scribe-logs
```

(or use the example in `examples/scribe-with-file-backend.ts`.)

## Running the examples

```bash
npx tsx examples/publish-one-event.ts
npx tsx examples/subscribe-and-handle.ts
npx tsx examples/scribe-with-file-backend.ts
```

## Cross-references

- `../STORY.md` — the market-square + newspaper-reporter narrative
- `../LEFT-BOOKEND.md` — the spec (and the source from which the SIG Contract
  was loaded)
- `../ADOPTION-RECIPE.md` — how a project adopts events-spine
- `../../METHODOLOGY.md` — provenance, marking, defects, bookends

🖇️ *Reference for `events-spine v0.1.0-pre`. Born 2026-05-21.*
