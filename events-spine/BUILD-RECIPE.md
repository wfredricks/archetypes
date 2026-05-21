# events-spine — BUILD-RECIPE

*Mechanical recipe for the sub-agent that builds the events-spine archetype's reference implementation. Written 2026-05-21 by Bhai with Bill in the loop. To be executed by a single sub-agent run against this recipe literally.*

*This recipe assumes you have read `STORY.md` and `LEFT-BOOKEND.md`. The recipe makes the LEFT-BOOKEND's commitments concrete in files, code, and tests.*

---

## Required reading (in order, before starting)

1. `archetypes/events-spine/LEFT-BOOKEND.md` — the spec. Principles, Constraints, Services, Processes, DataObjects. **Your authoritative source for what to build.**
2. `archetypes/events-spine/STORY.md` — the narrative. The market-square + newspaper-reporter framing. Use it to sanity-check that your build matches the lived-experience the archetype is meant to produce.
3. `archetypes/METHODOLOGY.md` — especially §Marking conventions, §Reference language, §Bookends. Your work follows these.
4. `archetypes/simple-auth/RIGHT-BOOKEND.md` — your role model. The bookend the events-spine right-bookend will compare against after Stage 2d adopts events-spine.
5. `~/.openclaw/workspace/artifacts/si-runtime/cli/build-history/BUILD-STAGE-02B-FINDINGS.md` — recent precedent for tight wall-clock execution and the esbuild lexer trap.
6. `~/.openclaw/workspace/artifacts/si-runtime/cli/build-history/BUILD-STAGE-02C-FINDINGS.md` — most recent recipe-file run; uses similar patterns.

## Scope

Build the reference implementation for events-spine v0.1.0-pre. Scaffold the four composed-archetype directories. Commit, tag, GitHub release.

**In scope:**
- Create `archetypes/events-spine/reference-impl/` with the full TypeScript reference
- Create sibling archetype directories: `simple-pubsub/`, `simple-subscriber/`, `scribe/`, `mcp-proxy/` (each with its own ARCHETYPE.md + ARCHETYPE.yaml + reference-impl pointer back to events-spine/reference-impl/)
- Implement publisher, subscriber, Scribe (MCP server + file backend + Bedrock summary), backend protocol
- Test suite: unit + integration. Integration test boots NATS in-process or via testcontainers (your call; document choice)
- ARCHETYPE.yaml composition declaration; ADOPTION-RECIPE.md skeleton
- CHANGELOG.md entry; tag `v0.1.0-pre`; GitHub release
- DEFECTS.md (initially empty; populated by Stage 2d adoption)
- ADOPTIONS.md (initially empty; populated when SI/I Stage 2d ships)

**Out of scope (per LEFT-BOOKEND.md §I):**
- Non-NATS bus implementations
- Non-file backends — protocol defined, not implemented
- JetStream / durable subjects (lossy-by-default for v0.1.0)
- Subscriber filtering at subscribe time beyond NATS subject filters
- Publisher authentication (bus assumed trusted within constellation)
- Cross-constellation event routing
- Stage 2d adoption itself (separate recipe)

## Hard constraints

- **Reference language is TypeScript.** Per METHODOLOGY.md §Reference language. No mixed-language compilation.
- **Marking conventions.** Per METHODOLOGY.md §Marking conventions. File-level JSDoc headers on every file with `// Why:` comments where behavior is non-obvious. Test-level headers describe behavior, not implementation.
- **Contract-intent in tests.** Tests use public API only. No assertions about internal fields, mock arrangements, or wire-format that wouldn't survive translation to Go/Python/Rust. README in `reference-impl/` says so explicitly.
- **No tokens or credentials in any test fixtures or example payloads.** Per LEFT-BOOKEND.md C5.
- **Atomic writes.** File backend writes use the temp-file + rename pattern (per simple-auth's `credentials.ts` precedent). No partial writes leaking.
- **Use `os.tmpdir()` not `/tmp/`** for any test temp directories.
- **No npm publishes.** Tags + GitHub releases only. Pre-1.0; not yet published.
- **DO NOT batch source files into one write.** Write each file individually; run `npx tsc --noEmit` at each major boundary (after each module group).
- **DO NOT skip tests.** Integration test MUST exercise the publish → Scribe → query round-trip end-to-end against a real NATS server (testcontainers or in-process).
- **Watch for the esbuild trap from 02B-FINDINGS:** do not write `*/` inside `//` line comments inside `/** */` blocks.
- **Hard wall-clock cap: 4 hours.** If you exceed this, stop, write a partial FINDINGS, and Signal Bill.

## Repo

`wfredricks/archetypes` (existing). Branch `events-spine-v0.1.0-pre`. Single PR. Squash-merge to main on completion.

## Directory layout (final target)

```
wfredricks/archetypes/
├── events-spine/
│   ├── ARCHETYPE.md                  # exists (we created during bootstrap; UPDATE to be complete)
│   ├── ARCHETYPE.yaml                # CREATE (composition declaration)
│   ├── STORY.md                      # exists
│   ├── LEFT-BOOKEND.md               # exists
│   ├── ADOPTION-RECIPE.md            # CREATE
│   ├── DEFECTS.md                    # CREATE (initially empty)
│   ├── ADOPTIONS.md                  # CREATE (initially empty)
│   └── reference-impl/
│       ├── README.md                 # CREATE
│       ├── package.json              # CREATE
│       ├── tsconfig.json             # CREATE
│       ├── vitest.config.ts          # CREATE
│       ├── .eslintrc.cjs             # CREATE (copy/adapt from cli repo)
│       ├── .prettierrc               # CREATE (copy/adapt from cli repo)
│       ├── .gitignore                # CREATE
│       ├── src/
│       │   ├── index.ts              # public re-exports
│       │   ├── types.ts              # ScribeEvent, SubjectFilter, QueryFilter, TailFilter, etc.
│       │   ├── publisher/
│       │   │   ├── index.ts
│       │   │   ├── publisher.ts      # Publisher implementation
│       │   │   └── README.md         # "moved here from simple-pubsub for co-location; archetype root: ../../simple-pubsub/"
│       │   ├── subscriber/
│       │   │   ├── index.ts
│       │   │   ├── subscriber.ts     # Subscriber implementation
│       │   │   └── README.md         # pointer back to ../../simple-subscriber/
│       │   ├── scribe/
│       │   │   ├── index.ts
│       │   │   ├── scribe.ts         # Scribe main process (boot → subscribe → record)
│       │   │   ├── backend-protocol.ts  # ScribeBackend interface
│       │   │   ├── backends/
│       │   │   │   └── file-backend.ts # JSONL file backend
│       │   │   ├── summary.ts        # Daily summary generation (Bedrock/Haiku)
│       │   │   ├── mcp-server.ts     # MCP server exposing query/tail/summary
│       │   │   └── README.md         # pointer back to ../../scribe/
│       │   └── mcp-proxy/
│       │       └── README.md         # docs only; no code; pointer back to ../../mcp-proxy/
│       ├── tests/
│       │   ├── unit/
│       │   │   ├── publisher.test.ts
│       │   │   ├── subscriber.test.ts
│       │   │   ├── file-backend.test.ts
│       │   │   ├── scribe.test.ts
│       │   │   ├── summary.test.ts
│       │   │   └── mcp-server.test.ts
│       │   ├── integration/
│       │   │   ├── _harness.ts       # boot NATS + Scribe + tmpHome teardown
│       │   │   └── end-to-end.test.ts # publish → Scribe captures → query returns
│       │   └── README.md             # "tests are contract-intent; translatable to other languages"
│       ├── examples/
│       │   ├── publish-one-event.ts
│       │   ├── subscribe-and-handle.ts
│       │   └── scribe-with-file-backend.ts
│       └── CHANGELOG.md
├── simple-pubsub/                    # CREATE — primitive archetype directory
│   ├── ARCHETYPE.md                  # CREATE
│   ├── ARCHETYPE.yaml                # CREATE (kind: primitive)
│   └── reference-impl/
│       └── POINTER.md                # "Lives at archetypes/events-spine/reference-impl/src/publisher/"
├── simple-subscriber/                # CREATE — primitive archetype directory
│   ├── ARCHETYPE.md
│   ├── ARCHETYPE.yaml
│   └── reference-impl/
│       └── POINTER.md
├── scribe/                           # CREATE — primitive archetype directory
│   ├── ARCHETYPE.md
│   ├── ARCHETYPE.yaml
│   └── reference-impl/
│       └── POINTER.md
└── mcp-proxy/                        # CREATE — meta-pattern archetype directory
    ├── ARCHETYPE.md
    ├── ARCHETYPE.yaml                # kind: meta-pattern; no reference-impl
    └── README.md                     # the meta-pattern explained at length
```

## Phases

### Phase A — Branch + scaffold

A1. `git checkout -b events-spine-v0.1.0-pre` on `wfredricks/archetypes` (you may need to clone first to `~/.openclaw/workspace/artifacts/archetypes/` if not already cloned).

A2. Create the four sibling archetype directories: `simple-pubsub/`, `simple-subscriber/`, `scribe/`, `mcp-proxy/` (per layout above). Each gets ARCHETYPE.md + ARCHETYPE.yaml + reference-impl/POINTER.md (except mcp-proxy which gets README.md instead of POINTER.md because it's docs-only).

A3. Each ARCHETYPE.yaml uses:
```yaml
name: <archetype-name>
kind: primitive  # or "meta-pattern" for mcp-proxy
description: <one paragraph from LEFT-BOOKEND.md>
composes: []
reference_impl:
  in_tree: true
  pointer: ../events-spine/reference-impl/src/<subdir>/
adopters: []
defects_known: []
```

A4. Each ARCHETYPE.md is short (~1 page): name, tagline, description, when to use, when NOT to use, composition (none — primitive), reference-impl pointer, adoption-recipe pointer (citing events-spine's), known defects (none initially), adopters (none initially).

### Phase B — reference-impl scaffold

B1. Create `events-spine/reference-impl/` with package.json:
- name: `@solution-intelligence/events-spine-reference` (NOT for publish; just an internal name)
- version: `0.1.0-pre`
- type: module
- scripts: `build`, `test`, `test:coverage`, `lint`, `typecheck`
- runtime deps: `nats` (NATS.js client), `@modelcontextprotocol/sdk` (MCP TypeScript SDK), `@aws-sdk/client-bedrock-runtime` (for summary), `uuid`, `yaml`
- devDeps: `vitest`, `typescript`, `@types/node`, `eslint`, `prettier`, `tsx`

B2. tsconfig.json: ES2022 target, strict, NodeNext module, declaration: true, sourceMap: true.

B3. vitest.config.ts with coverage thresholds: 80% statements, 70% branches (mcp-server and bedrock summary can be excluded from coverage gate via vitest config exclude — they require integration to verify meaningfully).

B4. .eslintrc.cjs, .prettierrc, .gitignore — copy patterns from `wfredricks/solution-intelligence-cli`.

B5. README.md for `reference-impl/`:
- Explains that this is the canonical TypeScript reference for events-spine
- Cross-references STORY.md and LEFT-BOOKEND.md
- States the contract-intent discipline: "These tests are written to be translatable. When this archetype gets a Go reference, the test suite gets translated alongside the code."
- Quick-start: `npm install`, `npm run build`, `npm test`
- How to run the Scribe locally: `npx tsx src/scribe/scribe.ts --backend=file --root=/tmp/scribe-logs`
- How to run the examples in `examples/`

### Phase C — Core types

C1. `src/types.ts`:
- `ScribeEvent` (per LEFT-BOOKEND.md DO1)
- `SubjectFilter` (string alias, with JSDoc explaining NATS semantics)
- `QueryFilter`, `TailFilter` (per the backend protocol)
- `SummaryEntry` (cached daily-summary record)
- Public type exports

C2. Run `npx tsc --noEmit`. Must pass.

### Phase D — Publisher

D1. `src/publisher/publisher.ts`:
- `Publisher` interface (per LEFT-BOOKEND.md S1)
- `createPublisher(opts: PublisherOptions): Publisher` factory
- PublisherOptions: `{ natsUrl, publisherId, defaultSubject? }`
- `publish(event)`: NATS publish to `event.subject`, JSON-serialize the payload + envelope (id, publisherId, publishedAt, correlationId)
- `close()`: drain + close NATS connection

D2. `src/publisher/index.ts`: re-export `Publisher`, `createPublisher`, `PublisherOptions`.

D3. `src/publisher/README.md`: short. "Reference implementation for the simple-pubsub archetype. Lives here for co-location with the composite events-spine archetype. Archetype description: `../../../../simple-pubsub/ARCHETYPE.md`."

D4. `tests/unit/publisher.test.ts`:
- Test: createPublisher returns a Publisher with publish/close methods
- Test: publish wraps payload in ScribeEvent envelope correctly
- Test: publish handles missing optional fields
- Test: publish does NOT block on subscriber acknowledgment (fire-and-forget per P3)
- Test: close drains NATS cleanly
- Use vitest mocks for NATS client; do NOT require a real NATS server in unit tests

D5. Run gates: `npm run build`, `npm test -- tests/unit/publisher.test.ts`, `npm run lint`. All green.

### Phase E — Subscriber

E1. `src/subscriber/subscriber.ts`:
- `Subscriber` interface (per LEFT-BOOKEND.md S2)
- `createSubscriber(opts: SubscriberOptions): Subscriber` factory
- `subscribe(filter, handler)`: NATS subscribe to filter; on message: parse to ScribeEvent, hand to handler
- Returns `Subscription` with `unsubscribe()` method
- Error handling: handler exceptions are caught + logged, do NOT crash the subscriber

E2. `src/subscriber/index.ts`: re-export.

E3. `src/subscriber/README.md`: pointer to `../../../../simple-subscriber/ARCHETYPE.md`.

E4. `tests/unit/subscriber.test.ts`:
- Test: createSubscriber returns Subscriber
- Test: subscribe with filter matches expected subjects
- Test: handler invoked with parsed ScribeEvent
- Test: handler exception does NOT crash the subscriber
- Test: unsubscribe stops further deliveries
- Use vitest mocks for NATS client

E5. Run gates.

### Phase F — File backend + backend protocol

F1. `src/scribe/backend-protocol.ts`:
- `ScribeBackend` interface (per LEFT-BOOKEND.md S6)
- `QueryFilter`, `TailFilter` types (imported from types.ts)
- Documentation on what a conforming backend must do

F2. `src/scribe/backends/file-backend.ts`:
- `createFileBackend(opts: FileBackendOptions): ScribeBackend`
- FileBackendOptions: `{ root: string }`  — the directory to write JSONL into
- `write(event)`:
  - Compute target path: `<root>/<YYYY-MM-DD>.jsonl` where date is `event.publishedAt`'s UTC date
  - Append the event as one JSON line to the target file (atomic-ish; use append mode, but document the trade-off)
  - On write error: throw; caller handles
- `query(filter)`:
  - Compute date range from filter.since/until
  - For each date in range: read the file, parse each line, apply filter (subject regex match, payload match)
  - Return array up to filter.limit
- `tail(filter)`:
  - Read the most recent N events matching filter from today's file (and yesterday's if today is empty)
  - Return as async iterable

F3. `tests/unit/file-backend.test.ts`:
- Test: write → query round-trips the canonical ScribeEvent (DO1 verification per LEFT-BOOKEND.md H5)
- Test: file rotates by day (per LEFT-BOOKEND.md C2)
- Test: query honors subject filter
- Test: query honors time range
- Test: tail returns most recent N
- Test: corrupt JSON lines are skipped with warning (do not crash)
- Use `os.tmpdir() + fs.mkdtemp()` for tmp dirs (per hard constraint)

F4. Run gates.

### Phase G — Scribe

G1. `src/scribe/scribe.ts`:
- `Scribe` interface: `start()`, `stop()`
- `createScribe(opts: ScribeOptions): Scribe`
- ScribeOptions: `{ natsUrl, subjectFilter? (default ">"), backend: ScribeBackend, summaryConfig?: { enabled, hour, bedrockModel }, mcpServerConfig?: { enabled, transport } }`
- `start()`:
  - Connect to NATS
  - Subscribe to subjectFilter (default ">" per LEFT-BOOKEND.md P1)
  - On each message: parse to ScribeEvent, call backend.write()
  - If summaryConfig.enabled: schedule daily summary at hour
  - If mcpServerConfig.enabled: start MCP server (Phase I)
- `stop()`: drain NATS, close backend if it has close(), stop MCP server, clear timers

G2. `src/scribe/index.ts`: re-export.

G3. `src/scribe/README.md`: pointer to `../../../../scribe/ARCHETYPE.md`.

G4. `tests/unit/scribe.test.ts`:
- Test: start subscribes to default ">" filter
- Test: each received message reaches backend.write
- Test: start can be configured with non-default filter
- Test: stop cleanly closes resources
- Mock NATS client + backend; do NOT require real NATS

G5. Run gates.

### Phase H — Daily summary (Bedrock)

H1. `src/scribe/summary.ts`:
- `Summarizer` interface: `generate(date, subjectFilter, events): Promise<SummaryEntry>`
- `createBedrockSummarizer(opts: BedrockOptions): Summarizer`
- BedrockOptions: `{ model: string (default "us.anthropic.claude-haiku-4-5-20251001-v1:0"), maxEventsInPrompt?: number (default 500), credentials? }`
- `generate(...)`:
  - If events array is empty: return placeholder narrative "No events recorded for this day matching filter X"
  - If events array exceeds maxEventsInPrompt: sample (take first 100, middle 100, last 100, document this in narrative as "Summary based on sampled 300 of N events")
  - Compose Bedrock prompt: events JSON + summary instruction
  - Call Bedrock via @aws-sdk/client-bedrock-runtime
  - Return SummaryEntry: `{ date, subjectFilter, narrative, eventCount, sourceEventIds, generatedAt, partial: false }`

H2. Cache layer (in-memory map in scribe.ts):
- key: `${date}|${subjectFilter}`
- value: SummaryEntry
- On scribe.summary call: check cache, return cached if exists, else generate (rate-limited via C1: one generation per key per day)

H3. `tests/unit/summary.test.ts`:
- Test: generate returns SummaryEntry for non-empty events
- Test: generate returns placeholder narrative for empty events
- Test: generate handles sampling for large event counts
- Mock Bedrock client; do NOT call real Bedrock in unit tests
- Optional: env-var-gated integration test that DOES call Bedrock if AWS creds available (skip otherwise)

H4. Run gates.

### Phase I — MCP server

I1. `src/scribe/mcp-server.ts`:
- Uses `@modelcontextprotocol/sdk` (TypeScript MCP SDK)
- Exposes three tools per LEFT-BOOKEND.md S3, S4, S5:
  - `scribe.query` — params: subject?, since?, until?, match?, limit? — returns ScribeEvent[]
  - `scribe.tail` — params: subject?, last? — returns ScribeEvent[]
  - `scribe.summary` — params: date?, subject? — returns SummaryEntry (with partial: true if cache miss)
- Constructor takes ScribeBackend + Summarizer + cache
- Standard MCP server lifecycle: start, stop, tool registration

I2. `tests/unit/mcp-server.test.ts`:
- Test: MCP server registers expected three tools
- Test: scribe.query forwards to backend.query
- Test: scribe.tail forwards to backend.tail
- Test: scribe.summary returns cached value if exists; returns partial if not
- Mock backend + summarizer

I3. Run gates.

### Phase J — Integration test

J1. `tests/integration/_harness.ts`:
- Lifts the boot pattern from cli/tests/_harness.ts
- Boots NATS (use testcontainers or in-process `nats-server` binary if available; document choice)
- Returns: `{ natsUrl, tmpRoot, scribe, stop }`
- Cleanup tears down NATS + tmp dir

J2. `tests/integration/end-to-end.test.ts`:
- Test: publish event → Scribe captures → query returns the event (round-trip; LEFT-BOOKEND.md H5)
- Test: publish 10 events over 2 simulated days → query filters by date range correctly
- Test: subscribe receives published events
- Test: file-backend rotates on day boundary
- Test: stop is clean (no hanging connections)
- These tests REQUIRE a real NATS server; skip with reason if testcontainers / nats-server unavailable

J3. Run full test suite. All unit + integration tests pass.

### Phase K — Examples

K1. `examples/publish-one-event.ts`: minimal program that connects, publishes one event, exits cleanly.

K2. `examples/subscribe-and-handle.ts`: minimal program that connects, subscribes to `example.>`, logs received events, runs until SIGINT.

K3. `examples/scribe-with-file-backend.ts`: minimal program that starts the Scribe with file backend + MCP server enabled.

K4. Examples are NOT tested by the test suite. They are documentation that runs.

### Phase L — Archetype-level docs

L1. Update `events-spine/ARCHETYPE.md` to be complete (current version is a stub from bootstrap). Cite STORY.md, LEFT-BOOKEND.md, ADOPTION-RECIPE.md.

L2. Create `events-spine/ARCHETYPE.yaml`:
```yaml
name: events-spine
kind: composite
description: >
  Event-driven communication substrate. Publishers emit typed events;
  subscribers act on them; a canonical Scribe subscriber logs to a
  pluggable backend exposed via MCP. Composes simple-pubsub +
  simple-subscriber + scribe + mcp-proxy. NATS as the canonical bus.
reference_languages:
  primary: typescript
  available_translations: []
composes:
  - simple-pubsub
  - simple-subscriber
  - scribe
  - mcp-proxy
adopters: []  # populated when SI/I Stage 2d ships
defects_known: []  # populated by first adoption findings
```

L3. Create `events-spine/ADOPTION-RECIPE.md` (skeleton per LEFT-BOOKEND.md §VIII):
- Pre-adoption check (NATS reachable, TypeScript ≥5.0)
- Derivation (copy reference-impl files with JSDoc provenance headers)
- Configuration (NATS URL, publisher id, backend config)
- First publisher (wire one state-changing call)
- Verification (Scribe captures, file appears)
- Integration test (boot Scribe + publish + assert)
- CHANGELOG + FINDINGS (target project records adoption; defects flow back to events-spine/DEFECTS.md)

L4. Create `events-spine/DEFECTS.md` (initially empty; structure ready for first defect):
```markdown
# events-spine — Known Defects

*Every defect discovered during an adoption is documented here.*

## Defects

(None recorded yet. The first adoption — SI/I Stage 2d — will populate this.)
```

L5. Create `events-spine/ADOPTIONS.md` (initially empty).

L6. Create `events-spine/CHANGELOG.md`:
```markdown
# Changelog

## 0.1.0-pre — 2026-05-21

Initial release. Reference implementation in TypeScript.

- Publisher (simple-pubsub primitive reference)
- Subscriber (simple-subscriber primitive reference)
- Scribe (canonical subscriber) with file backend
- Scribe MCP server: scribe.query, scribe.tail, scribe.summary
- Daily narrative summary via Bedrock/Haiku
- mcp-proxy meta-pattern documentation
- Composition declared in ARCHETYPE.yaml
- ADOPTION-RECIPE.md skeleton

Adoption pending: SI/I Stage 2d.
```

### Phase M — PR + merge + tag + release

M1. Push branch.

M2. Open PR titled "events-spine v0.1.0-pre: composite archetype with reference impl". PR body:
- Cite STORY.md and LEFT-BOOKEND.md
- Summary of what's in the reference impl
- Note: this is the first native (in-tree) archetype reference implementation
- Test coverage summary

M3. Wait for CI green.

M4. Squash-merge with branch delete.

M5. Tag main: `events-spine-v0.1.0-pre`. **Use prefix tag** (not bare `v0.1.0-pre`) because the archetypes repo will eventually carry many archetypes each with their own versioning. Push tag.

M6. Create GitHub release for the prefix tag. Body cites CHANGELOG entry.

### Phase N — mcp-proxy README

N1. `mcp-proxy/README.md`: a substantive document (~2-3 pages) explaining the meta-pattern:
- What is the MCP-proxy pattern?
- Why it matters (backend-pluggability without code redeploy in publishers)
- Where it shows up (the Scribe, future graph backends, future identity backends, future blackboard backends)
- The contract: stable MCP surface; swappable backend; agent-callable from anywhere
- The Scribe as the first worked example (cite events-spine/reference-impl/src/scribe/)
- When to apply this pattern (anti-triggers: when the backend is genuinely uniform; when the MCP overhead exceeds the swap benefit)

This file is the meta-pattern's home in the registry. mcp-proxy/ARCHETYPE.md is short and points here.

### Phase O — FINDINGS + Signal

O1. Write `~/.openclaw/workspace/artifacts/archetypes-bootstrap/BUILD-EVENTS-SPINE-FINDINGS.md` (in workspace, not in the archetypes repo — this is build-history for our methodology). Same shape as BUILD-STAGE-02C-FINDINGS.md and BUILD-ARCHETYPES-A-B-FINDINGS.md. Sections:
- What shipped
- What worked smoothly (lessons confirmed)
- What surprised
- Wall-clock breakdown
- Hard-constraints compliance check
- Output checklist
- Methodology evidence (now four consecutive recipe-file native builds? Or whatever the count is)
- Recommendations for Stage 2d (adoption)

O2. Commit FINDINGS to workspace.

O3. **Signal Bill at +17176608721:** "events-spine v0.1.0-pre shipped. Reference-impl in-tree (TypeScript). Scribe with file backend + MCP server. https://github.com/wfredricks/archetypes/releases/tag/events-spine-v0.1.0-pre. Ready for Stage 2d (SI/I adopts events-spine)."

## Wall-clock estimate

Per the LEFT-BOOKEND hypothesis (H7) and the running calibration:

- Phase A (scaffold sibling dirs): ~10 min
- Phase B (reference-impl scaffold): ~10 min
- Phase C (types): ~10 min
- Phase D (publisher): ~25 min
- Phase E (subscriber): ~20 min
- Phase F (file backend): ~30 min
- Phase G (Scribe): ~30 min
- Phase H (Bedrock summary): ~25 min
- Phase I (MCP server): ~30 min
- Phase J (integration test): ~30 min
- Phase K (examples): ~15 min
- Phase L (archetype docs): ~20 min
- Phase M (PR + tag): ~15 min
- Phase N (mcp-proxy README): ~20 min
- Phase O (FINDINGS + Signal): ~15 min

Total expected: **~5 hours.** Hard cap: **4 hours**, but if you're close, request a check-in via Signal rather than auto-stopping. The first native composite is harder than primitive lifts; some slop is expected.

If wall-clock exceeds 4h with the integration test not yet green, prioritize unit-test coverage + getting the PR opened in a working state. Integration test can land in a follow-up commit. Document the deferral in FINDINGS.

## Output checklist

- [ ] Branch `events-spine-v0.1.0-pre` created
- [ ] Four sibling archetype directories created (simple-pubsub, simple-subscriber, scribe, mcp-proxy)
- [ ] `events-spine/reference-impl/` complete with src + tests + examples + package.json + tsconfig + vitest.config
- [ ] All source files have JSDoc headers per METHODOLOGY.md §Marking conventions
- [ ] All test files have test-level headers describing behavior
- [ ] `events-spine/ARCHETYPE.md` (updated to be complete), ARCHETYPE.yaml, ADOPTION-RECIPE.md, DEFECTS.md, ADOPTIONS.md, CHANGELOG.md
- [ ] Unit tests pass (`npm test -- tests/unit`)
- [ ] Integration test passes (`npm test -- tests/integration`) OR documented deferral in FINDINGS
- [ ] Linter clean (`npm run lint`)
- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] Examples runnable
- [ ] `mcp-proxy/README.md` substantive (~2-3 pages)
- [ ] PR opened, CI green, squash-merged
- [ ] Tag `events-spine-v0.1.0-pre` pushed
- [ ] GitHub release created
- [ ] `BUILD-EVENTS-SPINE-FINDINGS.md` committed to workspace
- [ ] Signal sent to Bill

## Notes for the sub-agent

- Recipe files are load-bearing. Read this end to end before starting.
- LEFT-BOOKEND.md is your authoritative source for what to build. STORY.md is your sanity check on what kind of substrate this is.
- If the recipe deviates from reality (as Stage 2b found with `userId` vs `targetUserId`), follow reality and note the deviation in FINDINGS.
- The esbuild trap: do not write `*/` inside `//` line comments inside `/** */` blocks.
- Mode 0600 / atomic writes are not strictly required for the file backend (JSONL append is fine), but the file's parent directory should be created with reasonable permissions (mkdir recursive).
- Per LEFT-BOOKEND.md §X, do NOT specify performance characteristics, exact JSONL byte format, MCP registration mechanism — those are deferred.
- The five Principles (P1-P5) and five Constraints (C1-C5) are first-class commitments. Tests verify each (where verifiable). FINDINGS comments on each if the implementation drifted.
- The four primitive ARCHETYPE.md files (simple-pubsub, simple-subscriber, scribe, mcp-proxy) should each be ~1 page. Don't over-write them; the composite events-spine carries the weight.
- When stuck on a sub-decision the recipe doesn't specify, make the choice yourself, document it in FINDINGS as a recipe-gap-noted.

🖇️ *Recipe by Bhai, 2026-05-21. Informed by STORY.md, LEFT-BOOKEND.md, and the simple-auth bookend pair. To be executed by a single sub-agent run.*
