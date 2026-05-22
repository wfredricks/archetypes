# scripts/

> **Archetype reference-impl note.** These scripts are the canonical
> ops surface for a `solution-intel` adoption. They are shipped here as
> **template files** — every adopter-specific value is replaced with a
> `'@adopt:...'` placeholder string. Adopter copies MUST substitute
> their own namespace, package scope, env-var prefix, and PolyGraph
> connection details before running. Run
> `grep -rn "@adopt:" scripts/` after substitution and confirm zero hits
> remain in any `const … = '@adopt:...'` literal before invoking.

Adoption-level scripts that operate on a live solution-intel substrate.
The template defaults point at `bolt://localhost:7689` with the
constellation-neo4j credentials documented in the asi reference
adoption (see `archetypes-solution-intelligence` for the worked
example); adopters override via their adopter-prefix env vars
(`ASI_GRAPH_*` in the template; adopters rename).

| Script | Reads | Writes | Idempotent |
|---|---|---|---|
| `seed-solution.ts`                        | —                     | `:Solution {namespace}`                                              | Yes (clears + reseeds) |
| `load-contracts.ts`                       | LEFT-BOOKEND.md files | `:Contract` + sub-nodes via `@<adopter>/contract-loader`             | Yes (per `commitContract`) |
| `verify-graph.ts`                         | SIG                   | —                                                                   | Yes (read-only) |
| `query-events-spine.ts`                   | SIG                   | —                                                                   | Yes (read-only) |
| `snapshot-events-spine.ts`                | SIG                   | — (markdown to stdout)                                              | Yes (deterministic) |
| `writeback-events-spine-hypotheses.ts`    | SIG                   | H1–H5 status + evidence + verifiedAt                                 | Yes (advances verifiedAt) |
| `writeback-events-spine-stage-2d.ts`      | SIG                   | H6 + H7 status + evidence + verifiedAt                               | Yes (advances verifiedAt) |

## `seed-solution.ts`

Seeds an adoption's Solution Intelligence Graph (SIG) root node in PolyGraph.

```bash
# Default (assumes constellation-neo4j is up on bolt://localhost:7689):
npx tsx scripts/seed-solution.ts

# Custom Bolt URL / auth:
ASI_GRAPH_URL=bolt://host:port \
  ASI_GRAPH_USER=neo4j ASI_GRAPH_PASS=secret \
  npx tsx scripts/seed-solution.ts
```

**Idempotent.** Re-running clears any prior `adoptionId: "asi"` nodes and reseeds. Other namespaces are untouched.

**What it creates:** exactly one node:

```cypher
(s:Solution {
  name: "Archetypes",
  title: "Archetypes Solution Intel",
  namespace: "asi",
  adoptionId: "asi",
  adoptedAt: datetime("2026-05-21T13:42:00-04:00"),
  adoptionVersion: "solution-intel@solution-intel-reference-impl-2026-05-21",
  composes_identity: "simple-auth",
  composes_auditLedger: "simple-ledger",
  composes_eventing: "events-spine",
  composes_graph: "graph-db",
  cliBinary: "asi",
  apiPrefix: "/asi",
  identityHttpPort: 3101,
  envVarPrefix: "ASI",
  defaultConfigPath: "~/.asi/",
  packageScope: "@asi"
})
```

This Solution node is the anchor every subsequent contract in the asi SIG attaches to. Task 3 (load archetype contracts into the SIG) hangs new subgraphs off this root.

## `load-contracts.ts`

Loads archetype contracts (LEFT-BOOKEND.md → SIG) via the
`@asi/contract-loader` package. Currently loads `events-spine` and
`simple-auth`; extend as new archetypes graduate.

**Backend-pluggable since Phase 3a (2026-05-22).** The script lifts the
`selectBackend` env-var pattern from
`contract-loader/src/backends/select.ts`, so adopters can route the
same canonical script to either Neo4j (asi's default — preserves the
Phase 1c path against constellation-neo4j) or PolyGraph (embedded
leveldb — what `dla-stores-solution-intelligence` adopts at Phase 2.0).

```bash
# Neo4j (default; preserves prior behavior):
npx tsx scripts/load-contracts.ts

# PolyGraph (embedded leveldb at data/polygraph/):
SI_BACKEND=polygraph SI_POLYGRAPH_PATH=data/polygraph \
  npx tsx scripts/load-contracts.ts
```

Env vars (precedence: `SI_*` over legacy `ASI_*`; both honored during
the asi → solution-intel name transition):

| Var | Used by | Default |
|---|---|---|
| `SI_BACKEND`         | both     | `'neo4j'` |
| `SI_POLYGRAPH_PATH`  | PolyGraph | required when `SI_BACKEND=polygraph` |
| `SI_NAMESPACE`       | both     | `'@adopt:default-namespace'` |
| `SI_GRAPH_URL`       | Neo4j    | `bolt://localhost:7689` |
| `SI_GRAPH_USER`      | Neo4j    | `neo4j` |
| `SI_GRAPH_PASS`      | Neo4j    | `udt-pass-2026` |

**Idempotent.** Each contract is committed with `contractId + namespace`
scope; re-running re-creates the same sub-graph.

## `verify-graph.ts`

Read-only spot-check over the asi SIG. Prints the Solution root
properties and a count of anchored Contracts. Use after `seed-solution`
or `load-contracts` to confirm the namespace is wired correctly.

```bash
npx tsx scripts/verify-graph.ts
```

## `query-events-spine.ts`

Read-only inspector for the events-spine contract + hypothesis state in
the asi SIG. Dumps the Contract envelope and every sub-node
(Principles / Constraints / Services / Processes / DataObjects /
Hypotheses) as JSON to stdout. Prefer this over cypher-shell for
spot-checks during writeback runs.

```bash
npx tsx scripts/query-events-spine.ts
```

**Read-only.** Safe to re-run.

## `snapshot-events-spine.ts`

Regenerates the events-spine RIGHT-BOOKEND snapshot from the current SIG
state. Produces a markdown hypothesis table on stdout suitable for
committing as
`archetypes/events-spine/RIGHT-BOOKEND-snapshot-<YYYY-MM-DD>.md`.

```bash
npx tsx scripts/snapshot-events-spine.ts \
  > ../archetypes/events-spine/RIGHT-BOOKEND-snapshot-$(date +%Y-%m-%d).md
```

**Read-only.** The SIG is upstream truth; the snapshot file is downstream
evidence regenerated from the SIG, not hand-edited.

## `writeback-events-spine-hypotheses.ts`

Sets hypothesis status + evidence + `verifiedAt` on H1–H5 of the
events-spine contract in the asi SIG. H1–H5 are the
reference-impl-internal hypotheses verified by the events-spine build
itself; invoked at the end of the events-spine reference-impl build
(Phase N½ of the BUILD-RECIPE).

```bash
npx tsx scripts/writeback-events-spine-hypotheses.ts
```

**Idempotent.** Re-running SETs the same status + evidence; `verifiedAt`
advances to `now()` on every run by design — the timestamp records when
verification was last asserted, not when the hypothesis first flipped.

## `writeback-events-spine-stage-2d.ts`

Sets H6 + H7 of the events-spine contract from `untested` to their
post-adoption status with evidence drawn from Stage 2d (SI/I adoption).
Companion to `writeback-events-spine-hypotheses.ts`; touches **only**
H6 + H7 (H1–H5 untouched).

```bash
npx tsx scripts/writeback-events-spine-stage-2d.ts
```

**Idempotent** in the same way as the H1–H5 writeback. Splitting the two
writebacks keeps the provenance of each evidence string unambiguous
(archetype-internal vs. adopter-derived).
