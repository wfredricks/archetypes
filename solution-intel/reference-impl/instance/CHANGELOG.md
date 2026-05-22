# @solution-intelligence/instance — Changelog

## 0.1.0-pre — 2026-05-22 (Phase 3 lift)

- Initial canonical lift from `archetypes-solution-intelligence/instance/`
  at `solution-intel-reference-impl-2026-05-22g`.
- Whole-instance snapshot export/import per
  `artifacts/solution-intelligence/docs/INSTANCE-PORTABILITY.md`.
- Backend-agnostic on-disk format (PolyGraph + Neo4j).
- Identity preservation: PolyGraph node ids round-trip natively;
  Neo4j elementIds + all relationship ids carry an `_originalId`
  property so audit ledger references survive.
- Migrations catalog ships empty (v0.2.0-pre is the baseline).
- Round-trip integrity test covers a 23-node / 20-edge fixture with
  audit + grants ledgers; asserts node id preservation, audit
  restoration with `instance.import.completed` appended, and
  sha256 idempotency on re-export.
- `@adopt:` markers shipped for `default-substrate-version`,
  `default-instance-schema-version`, `default-audit-path`,
  `default-grants-path`, `default-export-dir`.
