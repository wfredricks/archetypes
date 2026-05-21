/**
 * Public library exports for `@solution-intelligence/graph-client`.
 *
 * // Why: Stage 2c stands up the package scaffold — the build, test, lint,
 * // and CI pipelines — without committing to a particular shape for the
 * // graph client yet. Stage 3 fills this file in with a typed
 * // `SIGraphClient` (modeled on `SIIdentityClient` in the cli package),
 * // a shared `SIHttpError`, and response types for the graph endpoints
 * // (CRUD on nodes and edges, traversal queries, audit-block linkage).
 * //
 * // Why an empty re-export now: keeping the entrypoint file present and
 * // wired through tsup / vitest means the CI pipeline exercises the full
 * // build-and-test loop end to end. When Stage 3 lands the
 * // implementation, the only thing that changes here is the body — the
 * // surrounding tooling has already been proven green.
 *
 * @module index
 */

export {};
