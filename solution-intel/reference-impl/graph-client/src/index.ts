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

// @adopt:composes:graph
// Q: Which graph-substrate archetype does this project compose?
// Default: graph-db via PolyGraph (the SI/G server hosts the project's
//          Solution Intelligence Graph; the graph-client package is the
//          typed HTTP client that talks to it). Stage 3 lands the
//          implementation.
// Reference: archetypes/graph-db/ARCHETYPE.md (pending)
// Notes: This package IS the graph composition site for the SI substrate.
//        Replacing the graph archetype (Neo4j-via-Bolt, Neptune, in-memory
//        for tests) means replacing this client's wire format and
//        endpoint surface. The Stage-3 implementation will pick that
//        wire format; until then this is a placeholder.
// Alternatives: any archetype whose contract satisfies the graph role.
//               Currently registered: graph-db (pending Stage 3 lift).

// @adopt:graph-endpoint
// Q: What URL does the graph client target by default?
//    Stage 3 will read this from .si/config.yaml's `si.graphUrl` (see
//    cli/src/url.ts's resolveProjectConfig). Until then, no default
//    endpoint is hard-coded — the scaffold is intentionally empty.
// Default: (none; supplied at construction time by the consuming process)
// Format: absolute URL

export {};
