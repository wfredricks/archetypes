# solution-intel reference-impl: contract-loader

*Snapshot of `archetypes-solution-intelligence/contract-loader/` — the
parse + commit + query surface for archetype contracts in a Solution
Intelligence Graph (SIG). Lifted into the archetype's in-tree
reference-impl on 2026-05-22.*

## Provenance

- **Lifted-from:** `wfredricks/archetypes-solution-intelligence` →
  `contract-loader/` @ commit
  `195096307965d7ccd1a5ddac5da1b09db6b77b60`.
- **Lift tag (planned):** `solution-intel-reference-impl-2026-05-22b`
  (or `…-22-cleanup` if the agents-only tag from Phase 1b already used
  `…-22`).
- **First adopter:** the asi profile itself (the snapshot's bytes match
  the asi `contract-loader/` package at the moment of lift, modulo
  `@adopt:` marker reinstatement and the harmonized `verifiedAt`
  storage type).

This subdirectory is a **snapshot**, not a live mirror. Subsequent
changes in the asi `contract-loader/` package do not propagate
automatically; the archetype tracks them on a refresh cadence (TBD).

## What it provides

Three layers, all read/write the SIG via `neo4j-driver`:

- **`parseBookend(path)`** — pure parser. Reads a LEFT-BOOKEND.md file
  and returns an in-memory `ContractGraph` (Principle/Constraint/
  Service/Process/DataObject/Hypothesis sub-nodes plus the Contract
  envelope and composition edges).
- **`commitContract(graph, options)`** — idempotent writer. DETACH
  DELETEs any prior contract with the same `contractId + namespace`
  then inserts the full graph. Anchors to the Solution root via
  `HAS_CONTRACT`.
- **`verifyContract(...)`, `listContracts(...)`, `showContract(...)`** —
  read helpers used by the `cli/` package's `asi contracts` command
  group.

### Canonical wire type for `Hypothesis.verifiedAt`

As of 2026-05-22, the contract-loader is the **single enforcement point**
for the `verifiedAt` storage type. Wire type is **ISO-8601 string**.

- **Write side:** `commit-contract.ts` calls `coerceVerifiedAtForWrite`
  on the value before passing it to the `CREATE … verifiedAt: $verifiedAt`
  parameter. Date and Neo4j DateTime objects are converted to ISO-8601
  strings; strings pass through; null/undefined become null.
- **Read side:** `query-contracts.ts` calls `normalizeVerifiedAtForRead`
  on the value returned from `n.verifiedAt AS verifiedAt`. Same
  coercion rules.
- **Downstream layers** (cli, agents) therefore see only `string | null`
  on the `Hypothesis.verifiedAt` field. The agents package keeps its
  defensive `normalizeIsoString` belt-and-braces helper, but it should
  never fire after this lift unless a non-loader writer drops a
  DateTime into the graph.

Rationale recorded in `artifacts/si-runtime/BUILD-PHASE-1C-FINDINGS.md`.

## `@adopt:` markers

Run `grep -rn "@adopt:" .` inside this directory to enumerate every
customizable value. The marker set (as of v0.1.0-pre) covers:

- `@adopt:default-graph-url` — Bolt URL when env/CLI overrides are absent.
  Lives in `src/commit-contract.ts` and `src/query-contracts.ts`.
- `@adopt:default-graph-user` — Neo4j auth user. Same two files.
- `@adopt:default-graph-pass` — Neo4j auth password (dev default; override
  in production via env). Same two files.

`package.json` carries the canonical name `@solution-intelligence/contract-loader`.
Adopters rename to their own scope (e.g. `@asi/contract-loader`) when they
fork the package. There is no `@adopt:` marker in JSON (no comment
syntax); the rename is mechanical and documented in
`solution-intel/ADOPTION-RECIPE.md`.

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
3. Re-apply the `verifiedAt` coercion helpers if a refresh accidentally
   drops them (round-trip tests must pass).
4. Update this file's lift date, commit hash, and version.
