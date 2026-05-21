/**
 * Behavior tests for the file backend (Service S6, Constraint C2,
 * Principle P2).
 *
 * Verifies Hypothesis H5: the two DataObjects (DO1, DO2) round-trip
 * cleanly through the file backend.
 *
 * Contract-intent: tests assert only what the `ScribeBackend` contract
 * promises. Translation note: a Go translation would write byte-for-byte
 * the same JSONL and pass the same suite.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScribeEvent } from '../../src/types.js';
import {
  subjectMatches,
  eventMatchesQuery,
} from '../../src/scribe/backend-protocol.js';
import { createFileBackend } from '../../src/scribe/backends/file-backend.js';

async function makeRoot(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'events-spine-file-backend-'));
}

function sampleEvent(overrides: Partial<ScribeEvent> = {}): ScribeEvent {
  return {
    id: overrides.id ?? 'evt-1',
    subject: overrides.subject ?? 's.x.y',
    publishedAt: overrides.publishedAt ?? '2026-05-21T20:00:00.000Z',
    publisherId: overrides.publisherId ?? 'pub-1',
    payload: overrides.payload ?? { ok: true },
    ...(overrides.correlationId ? { correlationId: overrides.correlationId } : {}),
  };
}

describe('subjectMatches (DO2 semantics)', () => {
  it('matches exact subjects', () => {
    expect(subjectMatches('a.b.c', 'a.b.c')).toBe(true);
    expect(subjectMatches('a.b.c', 'a.b.d')).toBe(false);
  });
  it('matches `>` against any subject', () => {
    expect(subjectMatches('>', 'a.b.c')).toBe(true);
    expect(subjectMatches('>', 'a')).toBe(true);
  });
  it('matches `*` as a single token', () => {
    expect(subjectMatches('a.*.c', 'a.b.c')).toBe(true);
    expect(subjectMatches('a.*.c', 'a.b.d')).toBe(false);
    expect(subjectMatches('a.*.c', 'a.x.y.c')).toBe(false);
  });
  it('matches `>` as the tail wildcard for one or more tokens', () => {
    expect(subjectMatches('a.>', 'a.b')).toBe(true);
    expect(subjectMatches('a.>', 'a.b.c')).toBe(true);
    expect(subjectMatches('a.>', 'a')).toBe(false);
    expect(subjectMatches('a.>', 'b.c')).toBe(false);
  });
});

describe('eventMatchesQuery', () => {
  const evt = sampleEvent({
    subject: 'si.identity.login.completed',
    publishedAt: '2026-05-21T12:00:00.000Z',
    payload: { email: 'a@b.test' },
  });

  it('passes when no filter fields are set', () => {
    expect(eventMatchesQuery(evt, {})).toBe(true);
  });
  it('honors subject filter', () => {
    expect(eventMatchesQuery(evt, { subject: 'si.identity.*.completed' })).toBe(true);
    expect(eventMatchesQuery(evt, { subject: 'si.identity.*.failed' })).toBe(false);
  });
  it('honors since/until bounds', () => {
    expect(
      eventMatchesQuery(evt, {
        since: '2026-05-21T00:00:00.000Z',
        until: '2026-05-22T00:00:00.000Z',
      }),
    ).toBe(true);
    expect(eventMatchesQuery(evt, { since: '2026-05-22T00:00:00.000Z' })).toBe(false);
    expect(eventMatchesQuery(evt, { until: '2026-05-21T00:00:00.000Z' })).toBe(false);
  });
  it('honors payload regex', () => {
    expect(eventMatchesQuery(evt, { match: 'a@b.test' })).toBe(true);
    expect(eventMatchesQuery(evt, { match: 'nope' })).toBe(false);
  });
  it('returns false (does not throw) on invalid regex', () => {
    expect(eventMatchesQuery(evt, { match: '[' })).toBe(false);
  });
});

describe('createFileBackend (S6) — write/query round-trip (H5)', () => {
  let root: string;

  beforeEach(async () => {
    root = await makeRoot();
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('write -> query returns the canonical ScribeEvent exactly (DO1 round-trip)', async () => {
    const backend = createFileBackend({ root });
    const event = sampleEvent({
      id: 'evt-rt',
      subject: 's.round.trip',
      publishedAt: '2026-05-21T08:00:00.000Z',
      payload: { foo: 'bar', nested: { n: 42 } },
      correlationId: 'corr-1',
    });
    await backend.write(event);

    const results = await backend.query({
      since: '2026-05-21T00:00:00.000Z',
      until: '2026-05-22T00:00:00.000Z',
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(event);
  });

  it('rotates files by UTC day (C2)', async () => {
    const backend = createFileBackend({ root });
    await backend.write(sampleEvent({ id: 'a', publishedAt: '2026-05-21T23:59:59.000Z' }));
    await backend.write(sampleEvent({ id: 'b', publishedAt: '2026-05-22T00:00:01.000Z' }));

    const files = (await fs.readdir(root)).sort();
    expect(files).toEqual(['2026-05-21.jsonl', '2026-05-22.jsonl']);
  });

  it('query honors subject filter', async () => {
    const backend = createFileBackend({ root });
    await backend.write(sampleEvent({ id: '1', subject: 'si.identity.login.completed' }));
    await backend.write(sampleEvent({ id: '2', subject: 'si.grants.recorded' }));

    const results = await backend.query({
      subject: 'si.identity.>',
      since: '2026-05-21T00:00:00.000Z',
      until: '2026-05-22T00:00:00.000Z',
    });
    expect(results.map((e) => e.id)).toEqual(['1']);
  });

  it('query honors time range across day boundary', async () => {
    const backend = createFileBackend({ root });
    await backend.write(sampleEvent({ id: 'day1', publishedAt: '2026-05-20T12:00:00.000Z' }));
    await backend.write(sampleEvent({ id: 'day2', publishedAt: '2026-05-21T12:00:00.000Z' }));
    await backend.write(sampleEvent({ id: 'day3', publishedAt: '2026-05-22T12:00:00.000Z' }));

    const results = await backend.query({
      since: '2026-05-21T00:00:00.000Z',
      until: '2026-05-22T00:00:00.000Z',
    });
    expect(results.map((e) => e.id)).toEqual(['day2']);
  });

  it('query enforces limit', async () => {
    const backend = createFileBackend({ root });
    for (let i = 0; i < 10; i++) {
      await backend.write(
        sampleEvent({
          id: `e${i}`,
          publishedAt: `2026-05-21T00:00:0${i}.000Z`,
        }),
      );
    }
    const results = await backend.query({
      since: '2026-05-21T00:00:00.000Z',
      until: '2026-05-22T00:00:00.000Z',
      limit: 3,
    });
    expect(results).toHaveLength(3);
  });

  it('tail returns the most recent N events', async () => {
    const backend = createFileBackend({
      root,
      clock: () => new Date('2026-05-21T23:00:00.000Z'),
    });
    for (let i = 0; i < 5; i++) {
      await backend.write(
        sampleEvent({
          id: `e${i}`,
          publishedAt: `2026-05-21T10:0${i}:00.000Z`,
        }),
      );
    }
    const tail: ScribeEvent[] = [];
    for await (const e of backend.tail({ last: 2 })) {
      tail.push(e);
    }
    expect(tail.map((e) => e.id)).toEqual(['e3', 'e4']);
  });

  it('corrupt JSON lines are skipped without throwing', async () => {
    const backend = createFileBackend({ root });
    await backend.write(sampleEvent({ id: 'ok-1', publishedAt: '2026-05-21T10:00:00.000Z' }));

    // Corrupt the file in place: append a partial line then a good line.
    const path = join(root, '2026-05-21.jsonl');
    await fs.appendFile(path, '{ this is not valid json\n', 'utf8');
    await backend.write(sampleEvent({ id: 'ok-2', publishedAt: '2026-05-21T11:00:00.000Z' }));

    const results = await backend.query({
      since: '2026-05-21T00:00:00.000Z',
      until: '2026-05-22T00:00:00.000Z',
    });
    expect(results.map((e) => e.id)).toEqual(['ok-1', 'ok-2']);
  });

  it('query against an empty root returns []', async () => {
    const backend = createFileBackend({ root });
    const results = await backend.query({
      since: '2026-05-21T00:00:00.000Z',
      until: '2026-05-22T00:00:00.000Z',
    });
    expect(results).toEqual([]);
  });
});
