/**
 * Provenance:
 *   Lifted into archetypes/solution-intel/reference-impl/ on 2026-05-22
 *   from wfredricks/archetypes-solution-intelligence/contract-loader/tests/commit-contract.test.ts
 *   @ commit 195096307965d7ccd1a5ddac5da1b09db6b77b60. Extended in
 *   Phase 1c with a Date-coercion round-trip test pinning the canonical
 *   ISO-8601 wire type at the contract-loader boundary.
 *
 *   Ownership: solution-intel canonical.
 */

/**
 * Round-trip test for commit + verify, against the live PolyGraph.
 *
 * // Why: The committer is the only path from in-memory ContractGraph to
 * // graph state. The contract for the committer is "what I write is
 * // what verifyContract reads back, idempotently across re-runs." This
 * // test pins both halves.
 *
 * // Test isolation: uses a synthetic namespace ("asi-test-contract-loader")
 * // and seeds its own Solution root so we never touch the operational
 * // `asi` namespace. The afterAll hook drops the namespace's entire
 * // subgraph to leave the live PolyGraph clean.
 *
 * // The test skips if PolyGraph is not reachable on the configured Bolt
 * // URL. This keeps `npm test` runnable in CI environments that don't
 * // run Neo4j.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import neo4j, { type Driver } from 'neo4j-driver';

import { parseBookend } from '../src/parse-bookend.js';
import { commitContract, verifyContract } from '../src/commit-contract.js';
import { showContract } from '../src/query-contracts.js';

const GRAPH_URL = process.env.ASI_GRAPH_URL ?? 'bolt://localhost:7689';
const GRAPH_USER = process.env.ASI_GRAPH_USER ?? 'neo4j';
const GRAPH_PASS = process.env.ASI_GRAPH_PASS ?? 'udt-pass-2026';
const TEST_NAMESPACE = 'asi-test-contract-loader';
const EVENTS_SPINE_BOOKEND =
  '/Users/williamfredricks/.openclaw/workspace/artifacts/archetypes/events-spine/LEFT-BOOKEND.md';

let driver: Driver | null = null;
let polygraphReachable = false;

beforeAll(async () => {
  const d = neo4j.driver(GRAPH_URL, neo4j.auth.basic(GRAPH_USER, GRAPH_PASS));
  try {
    const s = d.session();
    try {
      await s.run('RETURN 1');
      polygraphReachable = true;
    } finally {
      await s.close();
    }
    driver = d;
  } catch {
    polygraphReachable = false;
    await d.close();
    return;
  }

  // Seed a test-only Solution root we can anchor against.
  const session = driver.session();
  try {
    await session.run(`MATCH (n {namespace: $ns}) DETACH DELETE n`, { ns: TEST_NAMESPACE });
    await session.run(
      `CREATE (s:Solution {name: "TestArchetypes", namespace: $ns, adoptionId: $ns})`,
      { ns: TEST_NAMESPACE },
    );
  } finally {
    await session.close();
  }
});

afterAll(async () => {
  if (!driver) return;
  const session = driver.session();
  try {
    await session.run(`MATCH (n {namespace: $ns}) DETACH DELETE n`, { ns: TEST_NAMESPACE });
  } finally {
    await session.close();
  }
  await driver.close();
});

describe('commitContract — round-trip against live PolyGraph', () => {
  it('commits and verifies the events-spine contract', async () => {
    if (!polygraphReachable) {
      console.warn('[commit-contract.test] PolyGraph not reachable; skipping.');
      return;
    }
    const graph = parseBookend(EVENTS_SPINE_BOOKEND);
    const summary = await commitContract(graph, {
      namespace: TEST_NAMESPACE,
      graphUrl: GRAPH_URL,
      graphUser: GRAPH_USER,
      graphPass: GRAPH_PASS,
      driver: driver!,
    });
    expect(summary.contractId).toBe('events-spine-v0.1.0-pre');
    // 1 Contract + 5P + 5C + 6S + 2Pr + 2DO + 7H = 28 nodes
    expect(summary.nodeCount).toBe(28);
    // DECLARES_* edges: 5+5+6+2+2+7 = 27, + 1 HAS_CONTRACT = 28
    expect(summary.edgeCount).toBe(28);
    expect(summary.anchoredTo).toBe('TestArchetypes');

    const verify = await verifyContract(summary.contractId, TEST_NAMESPACE, {
      driver: driver!,
    });
    expect(verify.hasAnchor).toBe(true);
    // verify counts nodes tagged with contractId (excludes Solution)
    expect(verify.nodeCount).toBe(28);
  });

  it('is idempotent: re-commit leaves the same shape', async () => {
    if (!polygraphReachable) return;
    const graph = parseBookend(EVENTS_SPINE_BOOKEND);
    const first = await commitContract(graph, {
      namespace: TEST_NAMESPACE,
      driver: driver!,
    });
    const second = await commitContract(graph, {
      namespace: TEST_NAMESPACE,
      driver: driver!,
    });
    expect(second.nodeCount).toBe(first.nodeCount);
    expect(second.edgeCount).toBe(first.edgeCount);

    // Direct graph query: only ONE Contract node should exist for this
    // namespace + archetypeName.
    const session = driver!.session();
    try {
      const res = await session.run(
        `MATCH (c:Contract {archetypeName: 'events-spine', namespace: $ns}) RETURN count(c) AS c`,
        { ns: TEST_NAMESPACE },
      );
      expect(res.records[0].get('c').toNumber()).toBe(1);
    } finally {
      await session.close();
    }
  });

  it('fails loudly if Solution root for namespace is missing', async () => {
    if (!polygraphReachable) return;
    const graph = parseBookend(EVENTS_SPINE_BOOKEND);
    await expect(
      commitContract(graph, {
        namespace: 'asi-test-no-such-solution',
        driver: driver!,
      }),
    ).rejects.toThrow(/no Solution node found/i);
  });

  it('round-trips Hypothesis.verifiedAt through commit + show', async () => {
    // Why: F1.a contract — verifiedAt is written by commit, surfaced by
    // the query helper, and rendered by the CLI. Parsed bookends have
    // it null; if a writeback script populated it we must read the same
    // value back. This test seeds a `verifiedAt` on H6+H7 in memory,
    // commits, and reads back through showContract.
    if (!polygraphReachable) return;
    const graph = parseBookend(EVENTS_SPINE_BOOKEND);
    const verifiedAtStamp = '2026-05-21T18:00:00.000Z';
    for (const h of graph.hypotheses) {
      if (h.key === 'H6' || h.key === 'H7') {
        h.status = 'held';
        h.verifiedAt = verifiedAtStamp;
      }
    }
    await commitContract(graph, { namespace: TEST_NAMESPACE, driver: driver! });

    const detail = await showContract('events-spine', TEST_NAMESPACE, {
      driver: driver!,
    });
    expect(detail).not.toBeNull();
    const byKey = Object.fromEntries(detail!.hypotheses.map((h) => [h.key, h]));
    expect(byKey.H1.status).toBe('open');
    expect(byKey.H1.verifiedAt).toBeNull();
    expect(byKey.H6.status).toBe('held');
    expect(byKey.H6.verifiedAt).toBe(verifiedAtStamp);
    expect(byKey.H7.status).toBe('held');
    expect(byKey.H7.verifiedAt).toBe(verifiedAtStamp);
  });

  it('coerces Date input on Hypothesis.verifiedAt to ISO-8601 string on read', async () => {
    // Why: Phase 1c canonical wire type — contract-loader is the single
    // enforcement point. A Date passed in on the write side surfaces as
    // a normalized ISO-8601 string on the read side; downstream callers
    // (cli, agents) never see a Date echo. Round-trip pinned here.
    if (!polygraphReachable) return;
    const graph = parseBookend(EVENTS_SPINE_BOOKEND);
    const dateInput = new Date('2026-05-22T13:45:00.000Z');
    const expectedIso = dateInput.toISOString();
    for (const h of graph.hypotheses) {
      if (h.key === 'H6') {
        h.status = 'held';
        // Force a Date through the typed `string | null` slot; the
        // coercion at the write boundary is what we're pinning.
        (h as unknown as { verifiedAt: unknown }).verifiedAt = dateInput;
      }
    }
    await commitContract(graph, { namespace: TEST_NAMESPACE, driver: driver! });

    const detail = await showContract('events-spine', TEST_NAMESPACE, {
      driver: driver!,
    });
    expect(detail).not.toBeNull();
    const byKey = Object.fromEntries(detail!.hypotheses.map((h) => [h.key, h]));
    expect(typeof byKey.H6.verifiedAt).toBe('string');
    expect(byKey.H6.verifiedAt).toBe(expectedIso);
    // Null inputs still round-trip as null — belt-and-braces.
    expect(byKey.H1.verifiedAt).toBeNull();
  });
});
