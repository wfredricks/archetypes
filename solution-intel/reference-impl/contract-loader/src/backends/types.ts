/**
 * Provenance:
 *   Originated 2026-05-22 in archetypes-solution-intelligence (asi)
 *   under BUILD-PHASE-1E-PLAN.md §1e.1.
 *
 *   Lifted into archetypes/solution-intel/reference-impl/ on 2026-05-22
 *   (Phase 1e canonical refresh; tag `solution-intel-reference-impl-2026-05-22c`)
 *   from wfredricks/archetypes-solution-intelligence/contract-loader
 *   @ commit 3dbc71a2110a3b6a7d5f5422488102c2a4daf4e8.
 *
 *   Ownership: solution-intel canonical. Defines the storage-backend
 *   interface that contract-loader's writer (`commit-contract.ts`) and
 *   reader (`query-contracts.ts`) use, so the same code drives either
 *   Neo4j or PolyGraph.
 *
 *   `@adopt:default-backend` marker below — the canonical archetype
 *   defaults to `'polygraph'` for self-contained projects. Adopters
 *   running a live Neo4j cluster (e.g. the asi adoption) set this to
 *   `'neo4j'`.
 */

/**
 * Common backend surface used by `commit-contract.ts` and
 * `query-contracts.ts`. Two implementations live alongside this file:
 * `neo4j-backend.ts` (the original path — preserved 100% behavior-compatible)
 * and `polygraph-backend.ts` (new, embeds PolyGraph via leveldb).
 *
 * // Why: contract-loader was hard-coupled to `neo4j-driver` through
 * // Phase 1c. Phase 1e introduces an adapter so adopters can choose:
 * // Neo4j when they already operate one (asi's live constellation SIG),
 * // PolyGraph when they want a self-contained, government-ownable
 * // store with no external service. The public function signatures of
 * // contract-loader stay byte-for-byte unchanged.
 *
 * @module backends/types
 */

/**
 * The common backend surface. Implementations wrap either a Neo4j
 * driver session or a PolyGraph instance.
 *
 * // The two methods on `native` exist because PolyGraph's cypher
 * // bridge at v0.1.4 does NOT support `OPTIONAL MATCH`, `WITH`, or
 * // `count(DISTINCT)` — qengine territory. `verifyContract` uses
 * // those, so its PolyGraph path bypasses cypher and queries via
 * // `findNodes()` + `findRelationships()` directly. The Neo4j backend
 * // also implements `native.*` (one tiny cypher per call) so the
 * // verify path looks the same shape to callers.
 */
export interface Backend {
  /** Backend identity for logging and branching where unavoidable. */
  readonly kind: 'neo4j' | 'polygraph';

  /**
   * Run a Cypher query and return result rows.
   *
   * Each row is a `Record<string, unknown>` keyed by the RETURN
   * aliases (or the variable name when no alias is given). Neo4j's
   * native `records[i].toObject()` shape; PolyGraph's bridge already
   * returns the same shape from `engine.query()`.
   *
   * For PolyGraph: `params` are substituted into the cypher string by
   * the adapter before the bridge sees it (the bridge does not
   * natively bind `$name` parameters as of v0.1.4 — see polygraph
   * CHANGELOG §0.1.4 "Out of scope").
   */
  query(
    cypher: string,
    params?: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>>;

  /**
   * Backend-native primitives used where cypher would push the bridge
   * past v0.1.4. Used by `verifyContract` exclusively today.
   */
  native: {
    findNodes(
      label: string,
      filter?: Record<string, unknown>,
    ): Promise<Array<{ id: string; labels: string[]; properties: Record<string, unknown> }>>;
    findRelationships(
      type: string,
      filter?: Record<string, unknown>,
    ): Promise<
      Array<{
        id: string;
        startNode: string;
        endNode: string;
        properties: Record<string, unknown>;
      }>
    >;
  };

  /**
   * Resource cleanup. Idempotent — safe to call twice. For Neo4j
   * backends constructed from a caller-supplied driver, this is a
   * no-op (caller owns the driver lifecycle). For PolyGraph backends
   * this closes the underlying leveldb.
   */
  close(): Promise<void>;
}

/**
 * The selector input. A superset of every backend's connection
 * parameters; only the relevant ones are read per backend.
 *
 * // Why a single union shape: the public `CommitOptions` and
 * // `ContractsConnection` types embed exactly these fields so the
 * // selector and the public surface share the same option object.
 */
export interface BackendOptions {
  /** Explicit backend selector. Overrides the auto-detect rules below. */
  backend?: 'neo4j' | 'polygraph';

  // ── Neo4j-only ────────────────────────────────────────────────────
  /** Bolt URL (default `bolt://localhost:7689`). */
  graphUrl?: string;
  /** Auth user (default `neo4j`). */
  graphUser?: string;
  /** Auth password (default `udt-pass-2026` per TOOLS.md). */
  graphPass?: string;
  /**
   * Caller-provided Neo4j driver. When supplied, the backend
   * uses it directly and does NOT close it.
   */
  driver?: import('neo4j-driver').Driver;

  // ── PolyGraph-only ────────────────────────────────────────────────
  /**
   * Leveldb directory for the embedded PolyGraph instance. Required
   * when `backend === 'polygraph'`.
   */
  polygraphPath?: string;
}

/**
 * Resolves the backend identity from the option object using the
 * precedence rules defined in `BUILD-PHASE-1E-PLAN.md` §
 * "Public-surface backward compatibility":
 *
 *   1. `options.driver` supplied            → 'neo4j'
 *   2. `options.backend === 'polygraph'`    → 'polygraph'
 *   3. `options.polygraphPath` set          → 'polygraph'
 *   4. `options.graphUrl` startsWith bolt:// → 'neo4j'
 *   5. default                              → the value of
 *      `DEFAULT_BACKEND_KIND` below (this archetype defaults to
 *      'polygraph'; adopters override via `@adopt:default-backend`).
 *
 * Adopters who already operate a Neo4j cluster (the asi adoption is
 * the canonical example, since it shares a live constellation SIG
 * with the larger digital-twin substrate) set
 * `@adopt:default-backend` to `'neo4j'`. Self-contained projects
 * keep the PolyGraph default and ship an embedded leveldb directory.
 */
// @adopt:default-backend  Set to 'neo4j' if your adoption already operates a Neo4j cluster.
const DEFAULT_BACKEND_KIND: 'neo4j' | 'polygraph' = 'polygraph';

export function resolveBackendKind(options: BackendOptions): 'neo4j' | 'polygraph' {
  if (options.driver !== undefined) return 'neo4j';
  if (options.backend === 'polygraph') return 'polygraph';
  if (options.backend === 'neo4j') return 'neo4j';
  if (options.polygraphPath !== undefined) return 'polygraph';
  if (options.graphUrl && options.graphUrl.startsWith('bolt://')) return 'neo4j';
  return DEFAULT_BACKEND_KIND;
}
