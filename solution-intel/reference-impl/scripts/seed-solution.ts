/**
 * Provenance:
 *   Lifted into archetypes/solution-intel/reference-impl/ on 2026-05-22
 *   from wfredricks/archetypes-solution-intelligence/scripts/seed-solution.ts
 *   @ commit 195096307965d7ccd1a5ddac5da1b09db6b77b60.
 *
 *   Ownership: solution-intel canonical. Adopter copies replace the
 *   `'@adopt:...'` placeholder strings with adopter-specific values
 *   before running.
 */

/**
 * Seeds an adoption's Solution Intelligence Graph (SIG) root node in
 * PolyGraph.
 *
 * // Why: anchor every future contract in the adopter's SIG. That anchor
 * // is a single `Solution` node tagged with `adoptionId`. Every
 * // subsequent node loaded into this SIG hangs off this root.
 *
 * // What it does:
 * //   1. Connects to PolyGraph at bolt://localhost:7689 (auth neo4j /
 * //      udt-pass-2026 per TOOLS.md).
 * //   2. Verifies connectivity (`RETURN 1 AS ok`).
 * //   3. Idempotently clears prior asi-namespaced nodes
 * //      (`MATCH (n {adoptionId: "asi"}) DETACH DELETE n`).
 * //   4. Creates the Solution root node with the asi adoption profile
 * //      properties.
 * //   5. Verifies the seed by reading back the node count + key props.
 *
 * // Idempotent: re-running the script wipes the asi namespace cleanly
 * // and reseeds. Other namespaces are untouched.
 *
 * Usage:
 *   npx tsx scripts/seed-solution.ts
 *
 * Override the Bolt URL / auth via env vars:
 *   ASI_GRAPH_URL=bolt://host:port \
 *   ASI_GRAPH_USER=neo4j ASI_GRAPH_PASS=secret \
 *     npx tsx scripts/seed-solution.ts
 *
 * @module scripts/seed-solution
 */

import neo4j from 'neo4j-driver';

// ─── Adoption profile (the asi answers from BUILD-ARCHETYPES-SI-ADOPTION-PLAN.md) ──

// @adopt:default-namespace  Adopter's namespace tag (e.g. 'asi'); aligns with @adopt:namespace in identity.
const ADOPTION_ID = '@adopt:default-namespace';
const SOLUTION_NAME = '@adopt:solution-name';
const SOLUTION_TITLE = '@adopt:solution-title';
const NAMESPACE = '@adopt:default-namespace';
const CLI_BINARY = '@adopt:cli-binary-name';
const API_PREFIX = '@adopt:api-prefix';
const IDENTITY_HTTP_PORT = 3101;
const ENV_VAR_PREFIX = '@adopt:env-var-prefix';
const DEFAULT_CONFIG_PATH = '@adopt:default-config-path';
const PACKAGE_SCOPE = '@adopt:package-scope';
const ADOPTED_AT = '@adopt:adopted-at';
const ADOPTION_VERSION = '@adopt:adoption-version';
const COMPOSES_IDENTITY = '@adopt:composes:identity';
const COMPOSES_AUDIT_LEDGER = '@adopt:composes:audit-ledger';
const COMPOSES_EVENTING = 'events-spine';
const COMPOSES_GRAPH = '@adopt:composes:graph';

// ─── Connection ──────────────────────────────────────────────────────────────

// @adopt:default-graph-url  Bolt URL when env override is absent. Port literal is also @adopt:default-bolt-port.
// @adopt:default-bolt-port  Replace 7689 with the adopter's PolyGraph Bolt port.
const GRAPH_URL = process.env.ASI_GRAPH_URL ?? 'bolt://localhost:7689';
const GRAPH_USER = process.env.ASI_GRAPH_USER ?? 'neo4j';
// @adopt:default-graph-pass  Replace with the adopter's PolyGraph password (do NOT commit secrets).
const GRAPH_PASS = process.env.ASI_GRAPH_PASS ?? 'udt-pass-2026';

async function main(): Promise<void> {
  const driver = neo4j.driver(GRAPH_URL, neo4j.auth.basic(GRAPH_USER, GRAPH_PASS));

  try {
    // 1) Connectivity check.
    const session1 = driver.session();
    try {
      const probe = await session1.run('RETURN 1 AS ok');
      const ok = probe.records[0]?.get('ok');
      if (ok === undefined) {
        throw new Error('connectivity probe returned no row');
      }
      console.log(`[seed] connected to ${GRAPH_URL} (probe=${ok})`);
    } finally {
      await session1.close();
    }

    // 2) Idempotent clear of the asi namespace.
    const session2 = driver.session();
    try {
      const beforeRes = await session2.run(
        'MATCH (n {adoptionId: $adoptionId}) RETURN count(n) AS c',
        { adoptionId: ADOPTION_ID },
      );
      const before = beforeRes.records[0]?.get('c').toNumber?.() ?? 0;
      if (before > 0) {
        console.log(`[seed] clearing ${before} prior asi-namespaced node(s)`);
        await session2.run('MATCH (n {adoptionId: $adoptionId}) DETACH DELETE n', {
          adoptionId: ADOPTION_ID,
        });
      } else {
        console.log('[seed] no prior asi-namespaced nodes (clean install)');
      }
    } finally {
      await session2.close();
    }

    // 3) Seed the Solution root.
    const session3 = driver.session();
    try {
      const seedRes = await session3.run(
        `CREATE (s:Solution {
           name: $name,
           title: $title,
           namespace: $namespace,
           adoptionId: $adoptionId,
           adoptedAt: datetime($adoptedAt),
           adoptionVersion: $adoptionVersion,
           composes_identity: $composes_identity,
           composes_auditLedger: $composes_auditLedger,
           composes_eventing: $composes_eventing,
           composes_graph: $composes_graph,
           cliBinary: $cliBinary,
           apiPrefix: $apiPrefix,
           identityHttpPort: $identityHttpPort,
           envVarPrefix: $envVarPrefix,
           defaultConfigPath: $defaultConfigPath,
           packageScope: $packageScope
         })
         RETURN s.name AS name, s.namespace AS namespace`,
        {
          name: SOLUTION_NAME,
          title: SOLUTION_TITLE,
          namespace: NAMESPACE,
          adoptionId: ADOPTION_ID,
          adoptedAt: ADOPTED_AT,
          adoptionVersion: ADOPTION_VERSION,
          composes_identity: COMPOSES_IDENTITY,
          composes_auditLedger: COMPOSES_AUDIT_LEDGER,
          composes_eventing: COMPOSES_EVENTING,
          composes_graph: COMPOSES_GRAPH,
          cliBinary: CLI_BINARY,
          apiPrefix: API_PREFIX,
          identityHttpPort: neo4j.int(IDENTITY_HTTP_PORT),
          envVarPrefix: ENV_VAR_PREFIX,
          defaultConfigPath: DEFAULT_CONFIG_PATH,
          packageScope: PACKAGE_SCOPE,
        },
      );
      const row = seedRes.records[0];
      console.log(
        `[seed] created Solution root: name="${row.get('name')}" namespace="${row.get('namespace')}"`,
      );
    } finally {
      await session3.close();
    }

    // 4) Verify.
    const session4 = driver.session();
    try {
      const verifyRes = await session4.run(
        'MATCH (s:Solution {adoptionId: $adoptionId}) RETURN count(s) AS c, collect(s.name)[0] AS name, collect(s.namespace)[0] AS namespace',
        { adoptionId: ADOPTION_ID },
      );
      const c = verifyRes.records[0]?.get('c').toNumber?.() ?? 0;
      const name = verifyRes.records[0]?.get('name');
      const namespace = verifyRes.records[0]?.get('namespace');
      console.log(`[seed] verify: ${c} Solution node(s); name="${name}" namespace="${namespace}"`);
      if (c !== 1) throw new Error(`expected exactly 1 Solution node, got ${c}`);
      if (name !== SOLUTION_NAME) throw new Error(`expected name="${SOLUTION_NAME}", got "${name}"`);
      if (namespace !== NAMESPACE) {
        throw new Error(`expected namespace="${NAMESPACE}", got "${namespace}"`);
      }
    } finally {
      await session4.close();
    }

    console.log('[seed] OK — asi SIG anchored');
  } finally {
    await driver.close();
  }
}

main().catch((err) => {
  console.error('[seed] FAILED:', err.message ?? err);
  process.exitCode = 1;
});
