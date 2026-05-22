# @solution-intelligence/instance — Archetype Notes

*Snapshot doctrine for SI instances. Read alongside `../INSTANCE-PORTABILITY.md` (doctrine paper).*

## What this package is

The skeleton implementation of the **whole-instance export/import contract** named in `INSTANCE-PORTABILITY.md`. Produces and consumes a `tar.gz` carrying SIG + audit ledger + identity records + resolved markers + schema-version stamp.

## What this package is not

- Not the per-archetype export contract (a future granularity refactor).
- Not streaming replay from the audit ledger (a future direction).
- Not long-term-storage / encryption / sharing infrastructure (out of scope per doctrine).
- Not backend-swap migration tooling (the format is backend-agnostic but Phase 3 only verifies same-backend round-trips).

## `@adopt:` markers

Run `grep -rn "@adopt:" .` inside this directory to enumerate every marker. The adoption recipe walks the marker set in order.

Currently-shipped markers:

- `@adopt:default-substrate-version` — substrate version stamped into the manifest when none supplied. (default: `0.2.0-pre`)
- `@adopt:default-instance-schema-version` — instance schema version stamped into the manifest. (default: `0.2.0-pre`)
- `@adopt:default-audit-path` — adopter's audit ledger path. (default: `data/audit/audit.jsonl`)
- `@adopt:default-grants-path` — adopter's identity grants ledger path. (default: `data/audit/grants.jsonl`)
- `@adopt:default-export-dir` — adopter's default export output directory. (default: `data/exports/`)

## Re-lifts

Future canonical refreshes will replace `src/*.ts` and `tests/*.ts` wholesale. Re-apply the `@adopt:` markers (currently a manual diff; future work: a marker-aware merge tool).

## CI

The package's own test suite covers the round-trip integrity property required by `INSTANCE-PORTABILITY.md` §"What the contract requires the substrate to grow" #4. The asi adoption's CI runs the suite against PolyGraph and (when ASI_GRAPH_URL is set) against Neo4j.
