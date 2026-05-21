# mcp-proxy — Meta-Pattern

*Stable MCP surface in front of a swappable backend.*

Type: **meta-pattern**. No reference implementation; this is a named pattern
other archetypes apply.

---

## What the pattern is

When a service needs to expose **query / mutation affordances over an
opaque-from-the-consumer's-perspective backend**, the MCP-proxy pattern says:

1. Define a stable **MCP tool surface** — a small set of named tools with
   typed parameters and return shapes — that captures the contract the
   consumer needs.
2. Behind that surface, define an **adapter protocol** that backends
   implement.
3. Choose a concrete backend at deployment time via configuration. Consumers
   never reference the backend directly; they only call the MCP tools.

The backend is swappable. The MCP surface is the contract. The pattern is the
name we give to this layout.

In ArchiMate terms the MCP surface is the **Service** (externally-visible
contract); the adapter protocol is the **Interface** the Service uses
internally; the concrete backend (file, CloudWatch, OpenSearch, etc.) is one
**Application Component** that satisfies the Interface; the MCP-proxy is the
**Application Service** that fronts the chosen component for external
consumers.

---

## Why it matters

Three reasons the pattern is worth naming, separately.

### 1. Backend pluggability without code redeploy in publishers

Without the pattern: every consumer of a service must know which backend the
service uses, because it imports a backend-specific client (e.g. the
CloudWatch SDK). Swapping the backend means changing every consumer.

With the pattern: consumers call MCP tools (a generic transport-and-discovery
protocol). The service swaps its backend by changing its own configuration.
Consumers do not change. No coordinated redeploy across the constellation.

### 2. Agent-callable from anywhere

MCP is a standard, agent-friendly protocol. Once a service exposes its
contract as MCP tools, any MCP-aware agent — Bhai, OpenClaw sub-agents,
future declarative-composition orchestrators — can call it without
per-project glue. The contract is discoverable (`tools/list`) and the
arguments are typed (`inputSchema` per tool).

Without the pattern: agents need a custom adapter per service. The cost of
adding a new agent is `O(number of services)`. With the pattern: an agent
that speaks MCP speaks every MCP-proxy service automatically.

### 3. Composability under DSD

The declarative-software methodology composes archetypes into solutions.
Composition is cleanest when the composed components communicate through
**named, typed interfaces**. MCP tools are exactly that. An archetype that
exposes its contract through MCP-proxy composes into a DSD-generated
solution without bespoke wiring.

---

## Where the pattern shows up

The first worked example in this registry is the **Scribe** (inside
`events-spine`). The Scribe exposes three MCP tools — `scribe.query`,
`scribe.tail`, `scribe.summary` — in front of a `ScribeBackend` protocol. The
file backend ships with v0.1.0; future backends (CloudWatch, OpenSearch,
loki, agent-readable-graph) plug in by implementing the same protocol. No
MCP-tool surface changes.

Future archetypes likely to apply the pattern:

| Archetype (planned) | What's behind the proxy | Tools likely exposed |
|---|---|---|
| **graph-mcp** | Neo4j / Memgraph / GraphDB (any Bolt-compatible) | `graph.query`, `graph.match`, `graph.commit` |
| **identity-mcp** | bangauth / Cognito / corporate IdP | `identity.verify`, `identity.who`, `identity.grants` |
| **blackboard-mcp** | OpenSearch / DynamoDB / Postgres | `blackboard.read`, `blackboard.write`, `blackboard.watch` |
| **ledger-mcp** | chainblocks / Postgres-with-append-only / S3 immutables | `ledger.append`, `ledger.tail`, `ledger.verify` |

Each of these is a separate archetype with its own ARCHETYPE.md and
LEFT-BOOKEND.md. What they share is the MCP-proxy meta-pattern: a stable MCP
surface in front of a swappable backend.

---

## The contract

A conforming application of the MCP-proxy pattern MUST satisfy:

1. **Stable tool surface.** The MCP tools' names, parameter shapes, and
   return shapes are part of the consuming contract. Changes to them are
   breaking changes (semver major).

2. **Backend protocol distinct from the MCP surface.** Backend-specific
   affordances (CloudWatch metric filters, OpenSearch aggregations, Bolt
   APOC procedures) are NOT exposed through MCP tools. If a future use case
   demands one, expose it as a **backend-neutral** new tool that any
   conforming backend can implement — not as a backend-specific shim.

3. **MCP discoverability.** The service implements standard MCP
   `tools/list` and `tools/call`. Agents discover the service's tools at
   connect time; they do not hard-code tool names from prior knowledge
   (though typed clients may).

4. **Configuration-only backend choice.** Switching backends is a deploy /
   configuration concern, not a code concern for anyone outside the service.

5. **No leaked types from the backend.** The MCP tool return shapes are
   declared by the archetype, not by the backend. If the file backend uses
   JSONL and the OpenSearch backend uses a Lucene document, the MCP tool
   still returns the archetype's canonical type. Conversion happens inside
   the service.

---

## When to apply this pattern

- The service has a **clear set of read/query affordances** that consumers
  legitimately need.
- Those affordances can be expressed without leaking backend specifics.
- More than one realistic backend exists (or is likely within a few
  versions), so the pluggability is real.
- Consumers are distributed (multiple services, multiple agents) and a
  coordinated redeploy on backend change would be expensive.

## When NOT to apply this pattern (anti-triggers)

- **The backend is genuinely uniform.** If the only realistic backend choice
  is one specific implementation forever — e.g. a pattern that fundamentally
  depends on Postgres LISTEN/NOTIFY — the proxy pattern adds layers without
  value. Use the backend directly.

- **MCP overhead exceeds the swap benefit.** For very high-throughput inner
  loops (millions of calls per second), the MCP protocol's per-call overhead
  is real. The pattern fits operator/agent-facing query surfaces, not hot
  data-plane paths.

- **The contract is unstable.** If the tools are still being designed, MCP
  is overkill. Iterate on a simpler interface first; promote to MCP-proxy
  when the contract has stabilized across one or two adoptions.

- **You don't have an MCP-aware consumer.** If no one is going to call the
  service via MCP — only Java services calling each other via HTTP, for
  example — the agent-callability benefit is theoretical. Use plain HTTP.

---

## How to apply this pattern

1. **Name the tools.** Pick a small set (2-5 typically). Use the
   `<namespace>.<verb>` convention (`scribe.query`, `graph.match`).
2. **Define typed parameters** for each tool. JSON Schema is the MCP-native
   form; the archetype's TypeScript reference declares them via
   `inputSchema`.
3. **Define the backend protocol** as a TypeScript interface. Document what
   conforming backends MUST do — including ordering, filter semantics, error
   handling.
4. **Implement one reference backend** (typically the simplest — file,
   in-memory, or local) and ship it with the archetype's reference-impl.
5. **Document the meta-pattern citation.** The archetype's ARCHETYPE.md
   names `mcp-proxy` in its composition or in its "applies meta-pattern"
   section.

---

## The Scribe as worked example

See `../events-spine/reference-impl/src/scribe/mcp-server.ts`. The Scribe's
MCP server:

- Registers three tools (`scribe.query`, `scribe.tail`, `scribe.summary`)
  with typed `inputSchema`.
- Forwards each tool call to the configured `ScribeBackend` (the protocol
  in `../events-spine/reference-impl/src/scribe/backend-protocol.ts`).
- The file backend (`backends/file-backend.ts`) is one conforming
  implementation. Adding CloudWatch is a matter of writing another
  conforming implementation — the MCP server does not change.

The Scribe satisfies all five points of the contract above:

| Contract point | Where in the Scribe |
|---|---|
| Stable tool surface | `scribe.query` / `scribe.tail` / `scribe.summary` — versioned as part of `events-spine` |
| Backend protocol distinct from MCP | `ScribeBackend` interface in `backend-protocol.ts` |
| MCP discoverability | Standard `ListToolsRequestSchema` / `CallToolRequestSchema` handlers |
| Configuration-only backend choice | `createScribe({ backend: createFileBackend({ root }) })` — choice at construction |
| No leaked types | `ScribeEvent` is the canonical return shape regardless of backend |

When the second backend ships (likely CloudWatch in v0.2 or whenever Stage 2d
adoption demands it), the Scribe's MCP server is unchanged and no consumer
needs to update.

---

## Cost of the pattern

The pattern is not free.

- **Protocol overhead per call.** MCP is JSON-RPC-shaped; each call carries
  request/response framing cost. Negligible for operator surfaces and
  agent queries; non-negligible for hot inner loops.
- **Backend protocol design discipline.** The temptation to leak
  backend-specific helpers (a CloudWatch-only metric-filter tool, a Postgres
  CTE shortcut) is constant. The pattern requires resisting that.
- **Tool naming and documentation.** Each tool's name, parameters, and
  return shape are public contract. Naming wrong (or changing it later)
  costs.

The benefit — distributed agent-callability + pluggable backends + composable
under DSD — pays back when the constellation grows past 2-3 services.

---

## Related patterns

- **Hexagonal / ports-and-adapters.** MCP-proxy IS the ports-and-adapters
  pattern, with two specific instantiations: the port is the MCP tool
  surface; the adapter protocol is the backend interface. The novelty is
  the choice of MCP as the standard protocol (rather than language-native
  interfaces), which enables agent-callability.

- **GraphQL Federation.** Federation solves the same multi-backend / single
  surface problem at scale. MCP-proxy is its lighter cousin: simpler
  schema, no introspection cost, agent-friendly.

- **Service Mesh sidecars.** Mesh sidecars solve cross-cutting concerns
  (auth, retries, observability) at the network layer. MCP-proxy is at the
  contract layer. They compose: a meshed MCP-proxy service is normal.

---

🖇️ *Meta-pattern documented 2026-05-21. First worked example: the Scribe
inside `events-spine`. To be cited by future archetypes that need
backend-pluggability without forcing consumers to know about the backend.*
