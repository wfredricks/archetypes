# events-spine — Left Bookend (Spec)

*The spec half of the events-spine left-bookend pair. The story half is `STORY.md`; this is the structured commitment of what gets built and what postures it takes.*

*Uses the proposed ArchiMate-flavored SIG vocabulary (Principle, Constraint, Service, Process, DataObject) so the addendum-paper work tonight will have a concrete example to cite. See `~/.openclaw/workspace/memory/backlog-sig-archimate-ontology-2026-05-21.md` for the ontology extension this anticipates.*

*Written 2026-05-21 by Bhai with Bill in the loop. Pre-build. To be tested against reality by Stage 2d adoption and a Right Bookend after.*

---

## I. Scope

`events-spine` is a **composite archetype** that delivers a working eventing substrate to any adopter. It composes four registry entries:

- `simple-pubsub` (primitive) — typed publisher
- `simple-subscriber` (primitive) — typed subscriber
- `scribe` (primitive) — the canonical subscriber, with MCP server + swappable backend
- `mcp-proxy` (meta-pattern) — documentation only

The substrate's job: turn an installation into a town with a market square, citizens who can shout and listen, and a newspaper reporter who records what matters.

**In scope for v0.1.0-pre:**
- NATS as the bus (constellation already runs `udt-m2-nats`)
- TypeScript reference implementations for all primitives (per METHODOLOGY.md §Reference language)
- Scribe with file backend (JSONL)
- Scribe MCP server with `scribe.query`, `scribe.tail`, `scribe.summary`
- Daily narrative summary via Bedrock/Haiku
- One real adopter (SI/I in Stage 2d, separately)

**Out of scope for v0.1.0-pre:**
- Non-NATS bus implementations
- Non-file backends (CloudWatch, OpenSearch, etc.) — protocol defined, not implemented
- JetStream / durable subjects (lossy-by-default for v0.1.0)
- Subscriber filtering at subscribe time beyond the standard NATS subject filter
- Authentication of publishers (the bus is assumed trusted within the constellation)
- Cross-constellation event routing

## II. Principles (architectural posture)

These are **Principles** in the ArchiMate sense — normative stances this archetype commits to. Future SIGs that adopt events-spine inherit them and must either accept or explicitly override.

### Principle P1: The Scribe is a complete record by default

> The Scribe subscribes to `>` (everything) by default. The canonical log is a *complete* record of the square, not a curated record.

**Driver:** Operational simplicity. Adopters should not have to think about what gets logged on day one. Curation, if needed, happens at query time, not at subscribe time.

**Consequences:**
- Storage and bandwidth must be designed for full firehose, not for filtered slices
- Publishers may rely on "if I published it, the Scribe heard it" as an observability guarantee
- Adopters who want filtered logging can configure the Scribe's subject filter; the default stays `>`

**Alternative considered:** ship the Scribe with an empty subject filter, force adopters to configure. **Rejected** because it shifts thinking-cost to every adopter for no benefit; the cost of filtering at query time is negligible at the scale this archetype targets (small constellations, ≤1000 events/sec).

### Principle P2: The Scribe owns the canonical event format; backends adapt

> The Scribe's internal representation of an event is the canonical form. Backends (file, CloudWatch, OpenSearch, future) accept the canonical `ScribeEvent` and convert to their own representation on write.

**Driver:** Backend pluggability without contract drift. If the Scribe serialized differently per backend, swapping backends would silently change the stored format.

**Consequences:**
- The backend protocol takes `ScribeEvent` objects, not pre-formatted strings or bytes
- Each backend owns its own `Representation` (in ArchiMate Passive Structure terms) of the canonical `DataObject`
- Test suites for the Scribe verify against the canonical `DataObject`; backend-specific tests verify the `Representation` is reversible to canonical

**Alternative considered:** make each backend implement its own serialization end-to-end from raw NATS message. **Rejected** because it duplicates serialization logic in each backend and makes the Scribe's behavior backend-dependent.

### Principle P3: The bus is lossy by default

> Events published before the Scribe (or any subscriber) is connected are lost. Durability requires opt-in via JetStream or equivalent.

**Driver:** Operational simplicity again. JetStream adds complexity (stream management, retention policies, consumer state) that small constellations don't need. Adopters who need durability can opt in.

**Consequences:**
- Publishers should be designed to fail gracefully if no subscriber happens to be present (don't block on delivery confirmation)
- The Scribe should be running before publishers start in production
- The right-bookend will check whether Stage 2d adoption hit any "Scribe wasn't running" surprises; if it did, durability moves up the priority list for v0.2.0

**Alternative considered:** ship with JetStream and durable streams from v0.1.0. **Rejected** as scope creep for v0.1.0; defer to v0.2.0 if the right-bookend shows the lossy default biting adopters.

### Principle P4: Reporter, not editor

> The Scribe records what it hears. It does not transform, filter content, redact, or curate beyond what its configured subject filter selects.

**Driver:** Trust. If the Scribe rewrites events, downstream consumers cannot trust the log as a faithful record.

**Consequences:**
- Backends may apply their own indexing or transformation for query efficiency, but the canonical `ScribeEvent` is always retrievable
- The `scribe.summary` Process is explicitly a *separate* artifact, generated by an LLM pass over the recorded events; it does not modify the underlying log
- Future tempting features ("smart filtering," "auto-redaction," "event enrichment") should be REJECTED at this layer; they belong in a separate archetype (e.g. a hypothetical `event-curator`)

### Principle P5: The MCP surface is the contract; backends are implementation

> The Scribe exposes three MCP tools (`scribe.query`, `scribe.tail`, `scribe.summary`). The contract for adopters is the MCP surface, not the storage layer.

**Driver:** Backend swap should be a configuration change, not a code change for adopters.

**Consequences:**
- Adopters write code against the MCP surface, never directly against the file backend or CloudWatch SDK
- Backend-specific affordances (e.g. CloudWatch's metric filters) are NOT exposed through the MCP surface in v0.1.0; if a future use case demands them, we add backend-neutral primitives, not backend-specific tools

## III. Constraints

These are **Constraints** in the ArchiMate sense — restrictions limiting realization. They constrain the build.

### C1: One LLM call per summary generation per day

`scribe.summary` MUST cache the daily summary and serve from cache on repeat calls. Summary generation runs at most once per day per `(subject-filter, date)` tuple. **Rationale:** prevent runaway cost from adopters calling `scribe.summary` in tight loops.

### C2: File backend supports rotation by day

The file backend MUST write to a path like `<root>/<YYYY-MM-DD>.jsonl` so day-boundaries are explicit and rotation is automatic. **Rationale:** matches the daily-summary cadence; simplifies retention policies; makes "yesterday's events" a file-level question.

### C3: MCP server uses standard MCP protocol

The Scribe MCP server MUST conform to standard MCP — discoverable via the MCP server-list, callable by any MCP-aware agent (Bhai, OpenClaw sub-agents, the future DSD orchestrator). **Rationale:** future declarative-composition flows depend on being able to discover and call the Scribe without per-project glue.

### C4: TypeScript reference for all primitives

Per METHODOLOGY.md §Reference language, the canonical reference-impl is TypeScript. Translations to other languages may follow but are out of v0.1.0 scope. **Rationale:** captured in METHODOLOGY.md; TypeScript's multi-paradigm coverage supports future Go/Python/Rust transpositions.

### C5: No tokens in event payloads

Publishers MUST NOT include bearer tokens, login codes, or other credentials in event payloads. The Scribe will not redact; the Principle is "reporter, not editor." Therefore publishers carry the obligation. **Rationale:** the Scribe records everything; a token in a payload becomes a token in the log; the log is the canonical record; therefore the log is a credential leak. Cleanest fix is upstream prohibition.

## IV. Services (the contract surface)

The archetype delivers six **Services** in the ArchiMate sense — externally-visible contracts.

### S1: `publish(event: ScribeEvent): void`

The publisher Service. Takes a canonical event, emits to NATS on the event's `subject`, returns. Fire-and-forget; does not wait for subscriber acknowledgment.

```typescript
interface Publisher {
  publish(event: ScribeEvent): void;
  close(): Promise<void>;
}
```

### S2: `subscribe(filter: SubjectFilter, handler: (event: ScribeEvent) => void): Subscription`

The subscriber Service. Registers a handler against a subject filter pattern. Returns a `Subscription` object the caller can use to unsubscribe.

```typescript
interface Subscriber {
  subscribe(filter: SubjectFilter, handler: EventHandler): Subscription;
}

interface Subscription {
  unsubscribe(): void;
}
```

### S3: `scribe.query` (MCP tool)

Query the recorded log by subject filter, time range, and free-text regex over the payload.

**Parameters:**
- `subject?: string` — NATS-style subject filter (e.g. `si.identity.*`)
- `since?: string` — ISO-8601 timestamp, inclusive
- `until?: string` — ISO-8601 timestamp, exclusive
- `match?: string` — regex applied to the JSON-serialized payload
- `limit?: number` — max events to return (default 100)

**Returns:** array of `ScribeEvent` objects.

### S4: `scribe.tail` (MCP tool)

Stream recent events from the recorded log; matches subject filter.

**Parameters:**
- `subject?: string` — NATS-style subject filter
- `last?: number` — number of most-recent events to return (default 20)

**Returns:** array of `ScribeEvent` objects, newest last.

### S5: `scribe.summary` (MCP tool)

Return the daily narrative summary for a given date and subject filter.

**Parameters:**
- `date?: string` — ISO-8601 date (default: today)
- `subject?: string` — NATS-style subject filter (default: `>`)

**Returns:** `{ date, subject, narrative, eventCount, sourceEventIds }`. If the summary has not been generated yet (cache miss), the response includes `partial: true` and the narrative is "Summary not yet generated for this day."

### S6: Backend protocol

Adapter contract for swappable backends:

```typescript
interface ScribeBackend {
  write(event: ScribeEvent): Promise<void>;
  query(filter: QueryFilter): Promise<ScribeEvent[]>;
  tail(filter: TailFilter): AsyncIterable<ScribeEvent>;
}
```

A backend conforms to this contract. The file backend ships with the archetype; future CloudWatch/OpenSearch/loki backends conform.

## V. Processes (workflows with cadence)

These are **Processes** in the ArchiMate sense — flows with cadence/triggers.

### Pr1: Scribe boot → subscribe → record

**Trigger:** Scribe process starts
**Flow:**
1. Read configuration (NATS URL, subject filter, backend type + backend config)
2. Initialize backend (open file handle, validate write path)
3. Connect to NATS
4. Subscribe to the configured filter (default `>`)
5. For each received message: parse to `ScribeEvent`, hand to backend's `write()`
6. Continue until shutdown signal received

**Cadence:** continuous; one event handled per incoming NATS message.

### Pr2: Daily summary generation

**Trigger:** End-of-day (configurable; default `23:55 local time`)
**Flow:**
1. For each unique `(subject-filter, date)` combination requested in the last day:
   a. Query the backend for events matching the filter on that date
   b. If event count is non-zero: call Bedrock/Haiku with the events serialized + a "summarize today" prompt
   c. Cache the resulting narrative keyed by `(subject-filter, date)`
2. The cache is read by S5 (`scribe.summary`)

**Cadence:** daily; one Bedrock call per `(subject-filter, date)` per day (per C1).

**Implementation note:** Pr2 can be implemented as a cron job, a scheduled lambda, or a long-running scheduler inside the Scribe process. v0.1.0 picks the simplest: a setInterval inside the Scribe process that fires at end-of-day. Right-bookend reflects on whether this is sufficient.

## VI. DataObjects (canonical structures)

These are **DataObjects** in the ArchiMate Passive Structure sense — the canonical shape; backends own their own `Representation`.

### DO1: `ScribeEvent`

```typescript
interface ScribeEvent {
  /** Stable, unique event id (UUID v7 for time-ordering) */
  id: string;
  /** NATS subject the event was published on */
  subject: string;
  /** ISO-8601 timestamp when published */
  publishedAt: string;
  /** Publisher's id; for traceability */
  publisherId: string;
  /** Free-form payload; publishers own the schema for their subject */
  payload: Record<string, unknown>;
  /** Optional correlation id, for tracing related events */
  correlationId?: string;
}
```

**Canonical owner:** the Scribe. Backends serialize this object their own way (JSONL on disk, CloudWatch log event structure, OpenSearch document) but always round-trip back to this canonical type.

### DO2: `SubjectFilter`

A NATS-style subject filter string. E.g. `>` (everything), `si.>` (anything under si), `si.identity.*` (one segment), `*.identity.>` (any first segment, then identity, then anything). Standard NATS semantics; no extension.

## VII. Compositions

`events-spine` composes four registry entries. Each is its own directory with its own ARCHETYPE.md, but the reference-impl for all four lives inside `events-spine/reference-impl/` because they were first built together.

| Composed archetype | Kind | Lives at | Reference-impl |
|---|---|---|---|
| `simple-pubsub` | primitive | `archetypes/simple-pubsub/` | `archetypes/events-spine/reference-impl/src/publisher/` |
| `simple-subscriber` | primitive | `archetypes/simple-subscriber/` | `archetypes/events-spine/reference-impl/src/subscriber/` |
| `scribe` | primitive | `archetypes/scribe/` | `archetypes/events-spine/reference-impl/src/scribe/` |
| `mcp-proxy` | meta-pattern | `archetypes/mcp-proxy/` | docs only |

`ARCHETYPE.yaml` declares this composition explicitly.

If a future composite (e.g. a hypothetical `agent-pool` archetype) wants `simple-pubsub` without the rest, the primitive's reference-impl can be extracted from the events-spine tree at that point. Until then, co-location is correct.

## VIII. Adoption recipe shape

The full `ADOPTION-RECIPE.md` will be written as a separate document. This bookend commits to its skeleton:

1. **Pre-adoption check:** confirm NATS is reachable from the target project; confirm the target project has TypeScript ≥5.0
2. **Derivation:** copy the reference-impl files into the target project under `src/eventing/`, with provenance JSDoc headers per METHODOLOGY.md §Marking conventions
3. **Configuration:** target project supplies NATS URL, publisher id, and (if running its own Scribe) backend config
4. **First publisher:** target project wires one state-changing call to emit a publisher event
5. **Verification:** spin up Scribe with file backend; trigger the state change; verify the event appears in `<root>/<today>.jsonl`
6. **Integration test:** target project's test suite includes one integration test that boots Scribe + publishes + asserts the event was recorded
7. **CHANGELOG + FINDINGS:** target project's CHANGELOG records the events-spine adoption; FINDINGS captures any defects-discovered on the way in (back to events-spine/DEFECTS.md)

The Stage 2d (SI/I adopts events-spine) BUILD-RECIPE will fill in the concrete steps for that specific adoption.

## IX. Hypotheses to test in the right bookend

These are the claims this left-bookend commits to. The right bookend (after Stage 2d) will compare each against reality.

1. **The four Principles (P1-P5) survived implementation.** None of them got quietly violated in the reference-impl. If one was violated, the bookend names why and whether the Principle or the implementation should change.
2. **The five Constraints (C1-C5) were enforced.** Tests verify each. Stage 2d adoption did not require relaxing any.
3. **The six Services (S1-S6) shipped with the documented contracts.** No silent additions, no silent removals.
4. **The two Processes (Pr1-Pr2) ran with the documented cadence.** No surprise scheduling issues.
5. **The two DataObjects (DO1-DO2) round-tripped cleanly through the file backend.** Serialization/deserialization is reversible.
6. **Stage 2d adopted events-spine without per-adopter customization beyond configuration.** If SI/I had to modify the reference-impl, the bookend names the modification and asks whether it should flow back into events-spine itself.
7. **Wall-clock for Stage 2d stayed within estimate.** Recipe-file methodology held for the first non-trivial composite adoption.

If any hypothesis fails, the right bookend captures: what failed, why, what we learned, what changes (the implementation, the Principle, the recipe, or this bookend itself).

## X. What this bookend explicitly does not commit to

To avoid scope creep on the right-bookend comparison:

- The Scribe's MCP server registration mechanism (how OpenClaw discovers it). The bookend assumes standard MCP registration but doesn't specify the wiring.
- The exact JSONL file format byte-by-byte (the canonical type is `ScribeEvent`; the JSON serialization is implementation-defined within the canonical type's shape)
- Performance characteristics (event throughput, query latency). These are not v0.1.0 concerns; they'll be measured and characterized after Stage 2d adoption.
- Error handling beyond "fail gracefully" (specific retry policies, backoff strategies, dead-letter handling). v0.1.0 picks reasonable defaults; v0.2.0 considers explicit policies.
- Authentication, authorization, audit trail of who-published-what. The bus is assumed trusted; the publisher id is informational not authenticated. cATO and similar will care; that's a future archetype layer.

## XI. SIG ontology this bookend uses

This left-bookend deliberately uses the proposed SIG ontology extensions (Principle, Driver, Constraint, Service, Process, DataObject) ahead of their formal addition to the SIG paper. The addendum paper (queued for tonight, see `~/.openclaw/workspace/memory/backlog-sig-archimate-ontology-2026-05-21.md`) will cite this bookend as the concrete example.

If the addendum paper proposes different names than the ones here (e.g. uses ArchiMate's exact spelling, "Quality Goal" instead of plain "Goal"), this bookend should be updated to match before Stage 2d's adoption recipe is finalized. Otherwise: the names here become the canonical first-instance.

🖇️ *Spec by Bhai, in conversation with Bill, 2026-05-21. Left-bookend artifact. Written before code. Hypotheses to be tested by Stage 2d adoption and a right-bookend comparison.*
