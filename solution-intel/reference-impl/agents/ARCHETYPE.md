# solution-intel reference-impl: agents

*Snapshot of `archetypes-solution-intelligence/agents/` (the first
non-substrate surface of `solution-intel`). Lifted into the archetype's
in-tree reference-impl on 2026-05-22.*

## Provenance

- **Lifted-from:** `wfredricks/archetypes-solution-intelligence` →
  `agents/` (Phase 1b of the asi adoption,
  `artifacts/si-runtime/BUILD-PHASE-1B-PLAN.md`).
- **Lift tag (planned):** `solution-intel-reference-impl-agents-2026-05-22`.
- **First adopter:** the asi profile itself (the snapshot's bytes match
  the asi `agents/` package at the moment of lift).

This subdirectory is a **snapshot**, not a live mirror. Subsequent
changes in the asi `agents/` package do not propagate automatically;
the archetype tracks them on a refresh cadence (TBD).

## What it provides

Two pure-read agents that walk a Solution Intelligence Graph (SIG) and
emit findings:

- **CompletenessAgent** — seven rules (hypothesis status sweep,
  contract-no-hypotheses, dataobject-orphan, service-no-process).
- **BookendAuditAgent** — six rules diffing a SIG-regenerated right-bookend
  snapshot against a committed file.

Both are read-only on the SIG. Adopters who want refresh semantics layer
that on top.

## `@adopt:` markers

Run `grep -rn "@adopt:" .` inside this directory to enumerate every
customizable value. The marker set (as of v0.1.0-pre) covers:

- `@adopt:agent-name-completeness` — display name of the CompletenessAgent.
- `@adopt:agent-name-bookend-audit` — display name of the BookendAuditAgent.
- `@adopt:default-namespace` — Solution namespace queried by default
  (must match `@adopt:namespace` in `../identity/src/index.ts`).
- `@adopt:default-graph-url` — Bolt URL when env/CLI overrides are absent.
- `@adopt:default-graph-user` / `@adopt:default-graph-pass` — Neo4j
  credentials used in dev; override via env in production.

Composition is light: agents depend on a graph driver (`neo4j-driver`)
and on `@solution-intelligence/contract-loader` (peer reference-impl
package, sibling directory). No identity wiring; agents are operator
tools, not user-facing surfaces.

## What a refresh looks like

When the agents package in `wfredricks/archetypes-solution-intelligence`
ships a new minor version, the archetype refreshes by:

1. `rsync -a --exclude node_modules --exclude dist --exclude coverage
   --exclude package-lock.json` from the source tree.
2. Re-apply the `@adopt:` markers (currently a manual diff; future work:
   keep the markers in a sidecar so refresh is mechanical).
3. Update this file's lift date and version.

🖇️ *Reference implementation of an SI agent surface. Snapshot, not
mirror.*
