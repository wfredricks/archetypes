/**
 * Provenance:
 *   Lifted into archetypes/solution-intel/reference-impl/ on 2026-05-22
 *   from wfredricks/archetypes-solution-intelligence/scripts/snapshot-events-spine.ts
 *   @ commit 195096307965d7ccd1a5ddac5da1b09db6b77b60.
 *
 *   Ownership: solution-intel canonical. Adopter copies replace the
 *   `'@adopt:...'` placeholder strings (and the ASI_-prefixed env vars)
 *   with adopter-specific values before running.
 */

/**
 * Generate the right-bookend snapshot for events-spine by querying the
 * SIG. Produces a markdown table written to stdout.
 *
 * // Why: the RIGHT-BOOKEND-snapshot file in the events-spine archetype
 * // is downstream evidence — the SIG is upstream truth. When
 * // hypothesis status changes (via writeback scripts), the snapshot
 * // must be regenerated from the SIG, not hand-edited. This script
 * // makes that regeneration reproducible and grep-friendly.
 *
 * // Idempotency: read-only. Safe to re-run; output is deterministic
 * // for a given SIG state. Redirect stdout to a file to capture.
 *
 * // Usage:
 * //   npx tsx scripts/snapshot-events-spine.ts \
 * //     > ../archetypes/events-spine/RIGHT-BOOKEND-snapshot-<YYYY-MM-DD>.md
 *
 * @module scripts/snapshot-events-spine
 */

import neo4j from 'neo4j-driver';

// @adopt:default-namespace  Replace 'asi' with the adopter's namespace; replace ASI_ prefix with the adopter's env-var prefix.
const NAMESPACE = process.env.ASI_NAMESPACE ?? '@adopt:default-namespace';
// @adopt:default-graph-url  Replace 'bolt://localhost:7689' with the adopter's PolyGraph Bolt endpoint.
const GRAPH_URL = process.env.ASI_GRAPH_URL ?? 'bolt://localhost:7689';
// @adopt:default-graph-user  Replace 'neo4j' if the adopter's PolyGraph uses a non-default user.
const GRAPH_USER = process.env.ASI_GRAPH_USER ?? 'neo4j';
// @adopt:default-graph-pass  Replace 'udt-pass-2026' with the adopter's PolyGraph password (do NOT commit secrets).
const GRAPH_PASS = process.env.ASI_GRAPH_PASS ?? 'udt-pass-2026';

async function main(): Promise<void> {
  const driver = neo4j.driver(GRAPH_URL, neo4j.auth.basic(GRAPH_USER, GRAPH_PASS));
  const session = driver.session();
  try {
    const res = await session.run(
      `
        MATCH (c:Contract {archetypeName: 'events-spine', namespace: $namespace})
          -[:DECLARES_HYPOTHESIS]->(h:Hypothesis {namespace: $namespace})
        RETURN h.key AS key, h.text AS text, h.status AS status,
               h.evidence AS evidence, h.verifiedAt AS verifiedAt
        ORDER BY h.key
      `,
      { namespace: NAMESPACE },
    );
    console.log('| Key | Text (one-line) | Status | Evidence |');
    console.log('|-----|------------------|--------|----------|');
    for (const rec of res.records) {
      const key = rec.get('key') as string;
      const text = ((rec.get('text') as string) ?? '')
        .replace(/\n/g, ' ')
        .replace(/\|/g, '\\|')
        .replace(/\*\*/g, '')
        .slice(0, 160);
      const status = rec.get('status') as string;
      const evidence = ((rec.get('evidence') as string) ?? '')
        .replace(/\n/g, ' ')
        .replace(/\|/g, '\\|');
      console.log(`| ${key} | ${text} | **${status}** | ${evidence} |`);
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
