# solution-intel — Adoption Recipe (Sketch)

*Sketch v0.1, written 2026-05-21. The full recipe is deferred to the full lift. This sketch is enough for Task 2 (standing up `archetypes-solution-intelligence`) to follow.*

---

## What this recipe is

A step-by-step procedure for **adopting `solution-intel` into a new project**. After completing this recipe, the project has its own SI substrate: an identity service, a CLI for operator workflows, a graph-client scaffold, and (post-Stage-3) a SIG hosted in PolyGraph. From that substrate the project can adopt additional archetypes (events-spine, simple-auth-variants, blackboard, etc.) and express their contracts as nodes in its SIG.

## Pre-adoption checks

Before running the recipe, confirm:

1. **PolyGraph is reachable.** The graph substrate for the project's SIG must be running and reachable from the workstation doing the adoption. (Verifiable by hitting the PolyGraph health endpoint.)
2. **Node.js ≥ 20.** All three reference-impl subdirectories require Node 20+.
3. **A target adopter repo exists** and is empty (or accepts a new top-level directory tree).

## Step 1 — Copy the reference implementation

Copy the entire `archetypes/solution-intel/reference-impl/` tree into the target adopter repo, preserving directory structure:

```
target-repo/
  identity/         ← from archetypes/solution-intel/reference-impl/identity/
  cli/              ← from archetypes/solution-intel/reference-impl/cli/
  graph-client/     ← from archetypes/solution-intel/reference-impl/graph-client/
```

The copy is a **snapshot**, not a git submodule. The adopter owns the code.

## Step 2 — Mark provenance

Per METHODOLOGY.md §Marking conventions, every copied file gets a JSDoc header citing:

- The archetype name (`solution-intel`)
- The commit tag of the lift (`solution-intel-reference-impl-2026-05-21`)
- The source path within the archetype (e.g. `archetypes/solution-intel/reference-impl/identity/src/server.ts`)
- The pattern (`Solution Intelligence substrate v0.x`)
- Maintenance ownership (the adopter's team)
- Refresh policy
- The list of file-level modifications (initially: "none — copied verbatim")

Headers go on every adapted source file, including tests. This is the audit trail; skipping it breaks the methodology's compounding-quality property.

## Step 3 — Configure `contract-loader`

As of the **2026-05-22c reference-impl tag (Phase 1e)** the archetype
ships a backend-pluggable `contract-loader/` package. The same code
works against either Neo4j or PolyGraph, selected per call via the
options object. The default backend in the canonical archetype is
**PolyGraph** (`polygraph-db@^0.1.4` embedded via `LevelAdapter`);
adopters who already operate a Neo4j cluster flip the
`@adopt:default-backend` marker to `'neo4j'`. Copy the directory the
same way as Step 1 (`target-repo/contract-loader/`), then:

1. Re-apply provenance JSDoc headers per Step 2 (note the lift tag:
   `solution-intel-reference-impl-2026-05-22c`).
2. Answer the package's `@adopt:` markers as part of Step 4 below —
   the package-level ones are:
   - `@adopt:default-backend` (in `src/backends/types.ts`) — set to
     `'polygraph'` for self-contained projects (the canonical default)
     or `'neo4j'` for adopters with an existing Neo4j cluster.
   - `@adopt:default-graph-url` / `-user` / `-pass` (in
     `src/backends/neo4j-backend.ts`) — only consulted when the Neo4j
     backend is selected.
   The namespace is supplied by callers (CLI flag, env var, or
   programmatic option), not by the contract-loader itself.
   PolyGraph adopters supply `polygraphPath` per call (the leveldb
   directory); there is no module-level default.
3. The contract-loader's surface is unchanged from Phase 1c:
   - `parseBookend(path)` — LEFT-BOOKEND.md → in-memory `ContractGraph`.
   - `commitContract(graph, options)` — idempotent writer.
   - `verifyContract(…)`, `listContracts(…)`, `showContract(…)` — read helpers used by `<binary> contracts …`.
   New (additive) option fields: `options.backend`, `options.polygraphPath`.
4. The `cli/src/commands/contracts.ts` and the `BookendAuditAgent`
   both depend on this package. Update the adopter's package scope in
   `package.json` (`@solution-intelligence/contract-loader` → e.g.
   `@<adopter>/contract-loader`) and align the imports in the cli + agents
   packages accordingly.
5. **Recommendation:** start with the PolyGraph default. It's
   self-contained (no separate service to operate), boots from a
   leveldb directory, and survives across CLI invocations. Switch to
   Neo4j only when you need clustering, replication, or you're sharing
   a SIG across multiple adoptions — the asi adoption is the canonical
   example of the latter.

The `verifiedAt` harmonization (from Phase 1c) means downstream layers
(cli, agents) see only `string | null` for that field. The agents
package keeps a defensive `normalizeIsoString` belt-and-braces helper;
you should not need to touch it, but leave it in place.

## Step 3.b — Configure agents

As of v0.1.0-pre the archetype ships two pure-read agents in
`./reference-impl/agents/` (snapshot of the asi-profile package; lifted
2026-05-22). Copy the directory the same way as Step 1 (`target-repo/agents/`),
then:

1. Re-apply provenance JSDoc headers per Step 2 (note the agents lift
   tag: `solution-intel-reference-impl-agents-2026-05-22`).
2. Answer the agents' `@adopt:` markers as part of Step 4 below — the
   key ones are `@adopt:default-namespace` (must match `@adopt:namespace`
   in `identity/src/index.ts`), `@adopt:default-graph-url`, and the
   `@adopt:default-graph-user/pass` pair.
3. Wire `runCompletenessAgent` and `runBookendAuditAgent` into the
   project CLI's `agents` command group. The asi adoption's
   `cli/src/commands/agents.ts` is a reference shape: one `list`
   subcommand plus `<agent-name> run` for each agent, accepting
   `--format markdown|json` and the standard `--namespace/--graph-url`
   flags.

**Operator cadence:** run `<ns> agents completeness run` at least
weekly during active development — it catches `partial`/`violated`
hypotheses, contracts with no hypotheses, and stale `held` rows.
Run `<ns> agents bookend-audit run --archetype <name>` after every
writeback to a hypothesis status, or on a CI schedule, to catch drift
between the SIG and the committed `RIGHT-BOOKEND-snapshot-*.md` files
in the registry.

Both agents are read-only on the SIG; neither commits a refreshed
snapshot or rewrites graph state. Repair is always a human (or a
different, write-capable tool) decision.

## Step 3.c — Configure instance export/import

As of v0.1.0-pre the archetype ships an instance package in
`./reference-impl/instance/` (lifted 2026-05-22 at tag
`solution-intel-reference-impl-2026-05-22g`). It implements the
whole-instance snapshot contract from `INSTANCE-PORTABILITY.md`.
Copy the directory the same way as Step 1 (`target-repo/instance/`),
then:

1. Re-apply provenance JSDoc headers per Step 2 (note the instance
   lift tag: `solution-intel-reference-impl-2026-05-22g`).
2. Answer the instance's `@adopt:` markers as part of Step 4 below —
   the key ones are `@adopt:default-substrate-version`,
   `@adopt:default-instance-schema-version`, `@adopt:default-audit-path`
   (must match the identity service's `audit-log-path` resolution),
   and `@adopt:default-grants-path`.
3. Wire `exportInstance` and `importInstance` into the project CLI's
   `instance` command group. The asi adoption's
   `cli/src/commands/instance.ts` is a reference shape: an `export`
   subcommand requiring `--output`, an `import` subcommand requiring
   `--input` and supporting `--force`, with `--backend polygraph|neo4j`,
   `--polygraph-path`, `--graph-url`, `--audit-path`, `--grants-path`,
   `--substrate-version`, and `--instance-schema-version` flags.

**Operator cadence:** run `<ns> instance export --output
data/exports/<timestamp>.tar.gz` before any substrate upgrade and
before any potentially-destructive operation. The export is the
rollback handle. Pair with `<ns> instance import data/exports/<file>
--polygraph-path data/polygraph-restored` against a sibling directory
to verify the export is good without disturbing production state.

The migrations catalog under `instance/src/migrations/` is empty at
the Phase 3 baseline (v0.2.0-pre). When the substrate ships its first
schema change, the migration that bridges the version pair is added
to the catalog and applied automatically at import time. See the
migrations `README.md` for the migration interface.

## Step 4 — Scan for `@adopt:` markers

```sh
grep -rn "@adopt:" target-repo/{identity,cli,graph-client,agents,contract-loader,scripts}/
```

Two categories of marker appear:

- **`@adopt:<key>`** — identity-and-deployment values (namespace, project-id, default-port, service-name, app-name, audit-log-path, grants-ledger-path, cli-binary-name, credentials-dir, project-config-path, default-endpoint-env-var, login-url, support-email, allowed-email-domains, auth-mount-path, event-subject-prefix, graph-endpoint, agent-name-completeness, agent-name-bookend-audit, default-namespace, **default-backend** _(Phase 1e; contract-loader storage selector)_, default-graph-url, default-graph-user, default-graph-pass, **default-substrate-version** _(Phase 3; instance manifest stamp)_, **default-instance-schema-version** _(Phase 3)_, **default-audit-path** _(Phase 3)_, **default-grants-path** _(Phase 3)_, **default-export-dir** _(Phase 3)_).
- **`@adopt:composes:<role>`** — composition sites (identity, audit-ledger, eventing, graph, **storage-backend**).

Build a list. Answer the question in each marker before booting anything.

## Step 5 — Answer the markers

For each marker:

1. Read the `Q:` line.
2. Choose your project's answer. If keeping the default, that's a valid answer; record it.
3. Replace the default value in the code with your answer.
4. Leave the marker comment in place. It documents the choice for future maintainers.

**Start with `@adopt:namespace`** in `identity/src/index.ts` — it determines a cascade of other choices (env-var prefix, package scope, audit-event prefix, CLI binary name, default paths, service name). Once you've answered it, propagate the choice to the narrower markers it points back to (the marker text names them explicitly).

For composition markers, the default values point at the reference archetype (simple-auth, simple-ledger, graph-db, events-spine pending). To swap in a different archetype, replace the imports at the marker site with the chosen archetype's reference-impl imports; the surrounding code expects the same contract surface.

## Step 6 — Install dependencies and configure the substrate

```sh
cd target-repo/identity && npm install
cd target-repo/cli && npm install
cd target-repo/graph-client && npm install
cd target-repo/agents && npm install
```

Configure via env vars (the default surface; the markers above name each one) or via the project's `.<ns>/config.yaml` (where `<ns>` is your `@adopt:namespace` answer).

Minimum configuration:

- `<NS>_PROJECT_ID` — the project's canonical id
- `<NS>_APP_NAME` — human-readable name shown in identity emails
- `<NS>_AUDIT_PATH` — persistent path for the audit-ledger JSONL
- `<NS>_GRANTS_PATH` — persistent path for the role-grant ledger JSONL
- `<NS>_URL` (CLI side) — base URL of the identity service

## Step 7 — Boot identity → CLI → graph-client

```sh
cd target-repo/identity && npm start
# In another shell:
cd target-repo/cli && node dist/cli.js login --url http://localhost:<port>
```

The CLI's first `<ns> login` round-trip exercises both halves of the substrate: identity issues a token, the CLI caches it under `~/.<ns>/credentials`, subsequent `<ns> grant` / `<ns> revoke` commands flow through.

## Step 8 — Verify the substrate runs against PolyGraph

(Stage 3+ — the graph-client scaffold doesn't yet talk to PolyGraph. Until Stage 3 lands, this step is a placeholder: confirm PolyGraph is reachable from the substrate's host network, and reserve the graph URL in `.<ns>/config.yaml` as `<ns>.graphUrl`.)

## Step 9 — Load the project's first archetype contracts into the SIG

(Deferred to **Task 3** of the SIG-first pivot. The mechanics of "load a contract YAML and project it into PolyGraph as a subgraph" will be described there.)

After Step 9, the adopter project is running on its own SI substrate. Subsequent archetype adoptions (events-spine, blackboard, etc.) express their contracts as additional SIG subgraphs. Run `<ns> agents completeness run` against the freshly-loaded SIG — expect every loaded contract's hypotheses to surface as `open` (info) until adoption verifies them.

## What the full recipe will add

This sketch defers:

- The exact bytes-on-disk shape of the `.<ns>/config.yaml` after marker answering
- The systemd / containerization story for production deployment
- The chainblocks integration once Stage 3 lands (the `@adopt:composes:audit-ledger` marker will gain a concrete second alternative)
- The events-spine wire-up once Stage 2d lands (the `@adopt:composes:eventing` placeholder becomes a real composition site)
- The graph-server boot story once Stage 3 lands (a fourth subdirectory, `./graph/`, joins the reference-impl tree)
- Worked examples for each `@adopt:` marker — not just the question, but a concrete "for adopter X, the answer was Y because Z" walkthrough
- The DEFECTS.md back-fill from SI's Stage 2a/2b/2c findings

When SI is feature-complete, this sketch is replaced by the full recipe.

🖇️ *Sketch recipe. Enough for Task 2 to proceed; not yet enough for an independent adopter to run end-to-end without operator guidance.*
