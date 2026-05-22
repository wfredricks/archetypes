# @solution-intelligence/instance

*Whole-instance export/import skeleton for solution-intel SI instances.*

**Status:** `0.1.0-pre` (Phase 3, 2026-05-22). Skeleton landed; v0.2.0-pre is the baseline schema; migrations catalog is empty by design.

## Doctrine

This package implements the contract laid out in
`artifacts/solution-intelligence/docs/INSTANCE-PORTABILITY.md`:

> *The substrate upgrades, the instance endures.*

The contract has four obligations: **completeness**, **schema versioning**,
**reversibility**, **identity preservation**. Phase 3's whole-instance
snapshot is the first granularity (per-archetype export and streaming
replay are future directions).

## `@adopt:` markers

When an adopter lifts this package they resolve each marker with their
own value. The currently-shipped markers are:

- `@adopt:default-substrate-version` — substrate version stamped into
  the manifest when none is supplied on the call. Mirrors the
  adopter's substrate version (e.g. `'0.2.0-pre'` for the asi adoption
  at lift time).
- `@adopt:default-instance-schema-version` — instance schema version
  stamped into the manifest. Drives migration lookup on import. Equals
  the substrate version at baseline.
- `@adopt:default-export-dir` — default output directory for
  `instance export` when the operator does not pass `--output`. (Hint
  only; the CLI requires `--output` explicitly today; this marker is
  reserved for a future ergonomic default.)
- `@adopt:default-audit-path` — adopter's audit ledger path
  (e.g. `data/audit/audit.jsonl`). Used by `instance export` to
  include the ledger and by `instance import` as the append target.
- `@adopt:default-grants-path` — adopter's identity grants ledger path
  (e.g. `data/audit/grants.jsonl`).

Adopters who do not override resolve these to the canonical defaults
listed in each marker block.

## Public surface

```ts
import { exportInstance, importInstance } from '@solution-intelligence/instance';

// Export: produces a tar.gz at the given output path.
await exportInstance({
  output: '/path/to/instance-2026-05-22.tar.gz',
  namespace: 'asi',
  backend: 'polygraph',
  polygraphPath: './data/polygraph',
  auditPath: './data/audit/audit.jsonl',         // optional
  grantsPath: './data/audit/grants.jsonl',       // optional
  resolvedMarkersPath: './.si/config.yaml',      // optional
  substrateVersion: '0.2.0-pre',
  instanceSchemaVersion: '0.2.0-pre',
});

// Import: consumes a tar.gz; refuses non-empty target without force.
await importInstance({
  input: '/path/to/instance-2026-05-22.tar.gz',
  namespace: 'asi',
  backend: 'polygraph',
  polygraphPath: './data/polygraph-restored',
  auditPath: './data/audit/audit.jsonl',
  grantsPath: './data/audit/grants.jsonl',
  substrateVersion: '0.2.0-pre',
  force: false,
});
```

## Export format

A Phase 3 export is a `tar.gz` with this structure:

```
si-instance-export-<timestamp>-<schema-version>.tar.gz
├── manifest.json
├── sig/
│   ├── nodes.jsonl
│   └── edges.jsonl
├── audit/
│   └── audit.jsonl
├── identity/
│   └── grants.jsonl
└── config/
    └── resolved-markers.json
```

`nodes.jsonl` and `edges.jsonl` are **backend-agnostic**: identical
logical shape for PolyGraph-backed and Neo4j-backed instances.

## Identity preservation

- **Nodes:** PolyGraph supports `createNode(labels, props, id)` so node
  ids round-trip natively. Neo4j mints its own ids; the original elementId
  is preserved in a node property called `_originalId`.
- **Relationships:** Neither backend lets us choose a relationship id on
  create. Both backends record the original id in an edge property
  `_originalId`. The exporter anchors the edge row's `id` field to the
  `_originalId` so a re-export of a round-tripped instance produces the
  same `sigChecksum` byte-for-byte (idempotency).

## Migrations

`src/migrations/` is a directory of migrations bridging schema-version
pairs. **Phase 3 ships zero migrations** — v0.2.0-pre is the baseline.
The first real schema change will register the first migration.

A migration is identified by its `fromVersion` → `toVersion` pair and
implements a deterministic transformation. The catalog is searched by
BFS over the version pairs; an import that cannot find a chain refuses
with an actionable error.

## Provenance

Originated 2026-05-22 in `archetypes-solution-intelligence` under
`BUILD-PHASE-3-PLAN.md`. Lifted to canonical reference-impl at tag
`solution-intel-reference-impl-2026-05-22g`.
