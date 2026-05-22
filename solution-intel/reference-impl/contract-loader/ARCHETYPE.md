# solution-intel reference-impl: contract-loader

*Snapshot of `archetypes-solution-intelligence/contract-loader/` — the
parse + commit + query surface for archetype contracts in a Solution
Intelligence Graph (SIG). Refreshed for **Phase 1e** (backend-pluggable;
PolyGraph default in the canonical archetype) on 2026-05-22 under tag
`solution-intel-reference-impl-2026-05-22c`.*

## Provenance

- **Lifted-from:** `wfredricks/archetypes-solution-intelligence` →
  `contract-loader/` @ commit
  `3dbc71a2110a3b6a7d5f5422488102c2a4daf4e8` (Phase 1e merge to main,
  PR #6).
- **Lift tag:** `solution-intel-reference-impl-2026-05-22c` (the prior
  Phase 1c lift used `…-22b`).
- **Phase:** 1e — backend adapter (Neo4j or PolyGraph), per
  `artifacts/si-runtime/BUILD-PHASE-1E-PLAN.md`.

This subdirectory is a **snapshot**, not a live mirror. Subsequent
changes in the asi `contract-loader/` package do not propagate
automatically; the archetype tracks them on a refresh cadence (TBD).

## What it provides

Five public functions, all backend-agnostic via a `Backend` adapter:

- **`parseBookend(path)`** — pure parser. Reads a LEFT-BOOKEND.md file
  and returns an in-memory `ContractGraph` (Principle/Constraint/
  Service/Process/DataObject/Hypothesis sub-nodes plus the Contract
  envelope and composition edges).
- **`commitContract(graph, options)`** — idempotent writer. DETACH
  DELETEs any prior contract with the same `contractId + namespace`
  then inserts the full graph. Anchors to the Solution root via
  `HAS_CONTRACT`.
- **`verifyContract(contractId, namespace, options)`** — round-trip
  read for tests. Returns `{contractId, nodeCount, edgeCount, hasAnchor}`.
- **`listContracts(namespace, options)`** / **`showContract(archetypeName,
  namespace, options)`** — read helpers used by the `cli/` package's
  `asi contracts` command group.

### Backend adapter (Phase 1e)

`src/backends/` holds the storage abstraction:

- `types.ts` — `Backend` interface (`kind`, `query()`,
  `native.findNodes()/.findRelationships()`, `close()`) plus
  `BackendOptions` and `resolveBackendKind()`.
- `neo4j-backend.ts` — Neo4j implementation (drives a `neo4j-driver`
  session).
- `polygraph-backend.ts` — PolyGraph implementation (drives a
  `polygraph-db@^0.1.4` `LevelAdapter`). Commit-side writes are routed
  to native primitives (`createNode`, `createRelationship`) because the
  v0.1.4 regex bridge mangles property values containing commas, parens,
  or embedded quotes. Read-side queries use the bridge with adapter-side
  `$param` substitution, `count(...)` aggregation fallback, and
  JavaScript `ORDER BY` post-sort.
- `select.ts` — `selectBackend(options)` resolver.

**Selection precedence:**
1. `options.driver` supplied → `'neo4j'`
2. `options.backend === 'polygraph'` → `'polygraph'`
3. `options.polygraphPath` set → `'polygraph'`
4. `options.graphUrl` starts with `bolt://` → `'neo4j'`
5. default → value of `@adopt:default-backend` (this archetype: `'polygraph'`)

### Canonical wire type for `Hypothesis.verifiedAt`

As of 2026-05-22 (preserved from Phase 1c), the contract-loader is the
**single enforcement point** for the `verifiedAt` storage type. Wire
type is **ISO-8601 string**.

- **Write side:** `commit-contract.ts` passes the value through to the
  `CREATE … verifiedAt: $verifiedAt` parameter (`null` when unset).
- **Read side:** `query-contracts.ts` reads the value and surfaces it
  as `string | null`.
- **Downstream layers** (cli, agents) therefore see only `string | null`
  on the `Hypothesis.verifiedAt` field. The agents package keeps its
  defensive `normalizeIsoString` belt-and-braces helper.

Rationale recorded in `artifacts/si-runtime/BUILD-PHASE-1C-FINDINGS.md`.

## `@adopt:` markers

Run `grep -rn "@adopt:" .` inside this directory to enumerate every
customizable value. The marker set (as of v0.2.0-pre) covers:

- `@adopt:default-backend` — **new in Phase 1e.** `'polygraph'` (default
  in this archetype) or `'neo4j'`. Lives in
  `src/backends/types.ts`. Adopters running an existing Neo4j cluster
  flip this to `'neo4j'`.
- `@adopt:default-graph-url` — Bolt URL when env/CLI overrides are absent.
  Used only by the Neo4j backend. Lives in `src/backends/neo4j-backend.ts`.
- `@adopt:default-graph-user` — Neo4j auth user. Same file.
- `@adopt:default-graph-pass` — Neo4j auth password (dev default; override
  in production via env). Same file.

PolyGraph adopters supply `polygraphPath` per-call (the leveldb
directory). There is no module-level default for `polygraphPath` because
it's adopter-machine-specific (matches the `namespace` discipline).

`package.json` carries the canonical name `@solution-intelligence/contract-loader`.
Adopters rename to their own scope (e.g. `@asi/contract-loader`) when they
fork the package. There is no `@adopt:` marker in JSON; the rename is
mechanical and documented in `solution-intel/ADOPTION-RECIPE.md`.

The default `namespace` is supplied **by the caller** (CLI flag, env
var, or programmatic option) — there is no module-level namespace
literal in this package. The `@adopt:default-namespace` marker therefore
lives in the *cli* and *agents* packages, not here.

## What a refresh looks like

When the contract-loader package in
`wfredricks/archetypes-solution-intelligence` ships a new minor version,
the archetype refreshes by:

1. `rsync -a --exclude node_modules --exclude dist --exclude coverage
   --exclude package-lock.json` from the source tree.
2. Re-apply the `@adopt:` markers (currently a manual diff; future work:
   keep the markers in a sidecar so refresh is mechanical).
3. Update this file's lift date, commit hash, and tag.
4. Update CHANGELOG with the version delta.
