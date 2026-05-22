/**
 * Provenance:
 *   Originated 2026-05-22 in archetypes-solution-intelligence (asi)
 *   under BUILD-PHASE-3-PLAN.md §3.1. Lifted to canonical
 *   solution-intel/reference-impl 2026-05-22 (tag
 *   `solution-intel-reference-impl-2026-05-22g`).
 *
 *   Doctrine: INSTANCE-PORTABILITY.md — public surface for the
 *   whole-instance snapshot design.
 *
 *   Ownership: solution-intel canonical. Adopter copies replace
 *   `@adopt:` markers with adopter-specific values.
 */

/**
 * Public surface for `@solution-intelligence/instance`.
 *
 * @module index
 */

export {
  exportInstance,
  type ExportOptions,
  type ExportArtifact,
} from './export.js';

export {
  importInstance,
  type ImportOptions,
  type ImportResult,
} from './import.js';

export {
  EXPORT_SCHEMA_VERSION,
  SUBSTRATE_NAME,
  type ManifestV1,
  makeManifest,
  readManifest,
  writeManifest,
  validateManifest,
} from './manifest.js';

export {
  type NodeRow,
  type EdgeRow,
  writeNodesJsonl,
  writeEdgesJsonl,
  readJsonl,
  readJsonlAll,
} from './format.js';

export { sha256OfFiles } from './checksum.js';

export {
  migrations,
  findMigrationChain,
  type Migration,
  type MigrationContext,
  type MigrationResult,
  type MigrationBackendHandle,
} from './migrations/index.js';
