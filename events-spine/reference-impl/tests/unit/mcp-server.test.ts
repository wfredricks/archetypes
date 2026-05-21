/**
 * Behavior tests for the Scribe MCP server (S3 / S4 / S5).
 *
 * Contract-intent: tests verify (a) the three tools are registered with
 * the expected names, (b) query/tail forward to the backend with the
 * filter arguments, (c) summary returns the cached entry when present
 * and falls back to placeholder when no summarizer is configured.
 *
 * The MCP SDK's transport machinery is exercised by integration tests;
 * unit tests reach into the internal request handlers via the SDK's
 * `Server.setRequestHandler` registry indirectly — we drive the server
 * by simulating a callTool / listTools request shape.
 */

import { describe, it, expect } from 'vitest';

import type { ScribeEvent, SummaryEntry } from '../../src/types.js';
import {
  createScribeMcpServer,
  SCRIBE_TOOL_NAMES,
} from '../../src/scribe/mcp-server.js';
import type { ScribeBackend } from '../../src/scribe/index.js';
import type { Summarizer } from '../../src/scribe/summary.js';

function sampleEvent(overrides: Partial<ScribeEvent> = {}): ScribeEvent {
  return {
    id: overrides.id ?? 'evt-1',
    subject: overrides.subject ?? 's.x.y',
    publishedAt: overrides.publishedAt ?? '2026-05-21T20:00:00.000Z',
    publisherId: overrides.publisherId ?? 'pub-1',
    payload: overrides.payload ?? { ok: true },
  };
}

function makeRecordingBackend(initialEvents: ScribeEvent[] = []): {
  backend: ScribeBackend;
  lastQuery: unknown;
  lastTail: unknown;
} {
  let lastQuery: unknown = null;
  let lastTail: unknown = null;
  return {
    get lastQuery() {
      return lastQuery;
    },
    get lastTail() {
      return lastTail;
    },
    backend: {
      async write() {},
      async query(filter) {
        lastQuery = filter;
        return initialEvents;
      },
      async *tail(filter) {
        lastTail = filter;
        for (const e of initialEvents) yield e;
      },
    },
  } as { backend: ScribeBackend; lastQuery: unknown; lastTail: unknown };
}

// Why we drive the server via callTool's underlying handler instead of
// stdio: the MCP SDK's stdio transport requires a child process. The
// SDK exposes setRequestHandler internally; for unit testing we use the
// `_requestHandlers` map by invoking server.request directly via an
// in-memory transport-like shim.
//
// Simpler approach: cast the server to access its internal handler
// registry. This is the unit-test seam; integration tests will use a
// real transport.
async function callTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scribeServer: { server: any },
  name: string,
  args: Record<string, unknown> = {},
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // The SDK keeps registered handlers on a private map. We invoke the
  // handler directly by simulating a CallToolRequest.
  const handlers = scribeServer.server._requestHandlers as Map<
    string,
    (req: unknown) => Promise<unknown>
  >;
  const handler = handlers.get('tools/call');
  if (!handler) throw new Error('no tools/call handler registered');
  const result = (await handler({
    method: 'tools/call',
    params: { name, arguments: args },
  })) as { content: Array<{ type: 'text'; text: string }> };
  return result;
}

async function listTools(scribeServer: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any;
}): Promise<{ tools: Array<{ name: string }> }> {
  const handlers = scribeServer.server._requestHandlers as Map<
    string,
    (req: unknown) => Promise<unknown>
  >;
  const handler = handlers.get('tools/list');
  if (!handler) throw new Error('no tools/list handler registered');
  return (await handler({ method: 'tools/list', params: {} })) as {
    tools: Array<{ name: string }>;
  };
}

describe('createScribeMcpServer (S3/S4/S5)', () => {
  it('registers the three expected tools', async () => {
    const be = makeRecordingBackend();
    const server = createScribeMcpServer({
      backend: be.backend,
      summaryCache: new Map(),
      scribeSubjectFilter: '>',
    });
    const result = await listTools(server);
    const names = result.tools.map((t) => t.name).sort();
    expect(names).toEqual([...SCRIBE_TOOL_NAMES].sort());
  });

  it('scribe.query forwards arguments to backend.query', async () => {
    const events = [sampleEvent({ id: 'q1' }), sampleEvent({ id: 'q2' })];
    const be = makeRecordingBackend(events);
    const server = createScribeMcpServer({
      backend: be.backend,
      summaryCache: new Map(),
      scribeSubjectFilter: '>',
    });
    const result = await callTool(server, 'scribe.query', {
      subject: 'si.>',
      since: '2026-05-21T00:00:00.000Z',
      limit: 50,
    });
    expect(be.lastQuery).toMatchObject({
      subject: 'si.>',
      since: '2026-05-21T00:00:00.000Z',
      limit: 50,
    });
    const parsed = JSON.parse(result.content[0].text) as ScribeEvent[];
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('q1');
  });

  it('scribe.tail forwards arguments to backend.tail', async () => {
    const events = [sampleEvent({ id: 't1' })];
    const be = makeRecordingBackend(events);
    const server = createScribeMcpServer({
      backend: be.backend,
      summaryCache: new Map(),
      scribeSubjectFilter: '>',
    });
    const result = await callTool(server, 'scribe.tail', {
      subject: 'si.>',
      last: 5,
    });
    expect(be.lastTail).toMatchObject({ subject: 'si.>', last: 5 });
    const parsed = JSON.parse(result.content[0].text) as ScribeEvent[];
    expect(parsed[0].id).toBe('t1');
  });

  it('scribe.summary returns cached entry when present', async () => {
    const cached: SummaryEntry = {
      date: '2026-05-21',
      subject: '>',
      narrative: 'cached narrative',
      eventCount: 7,
      sourceEventIds: ['a', 'b'],
      generatedAt: '2026-05-21T23:00:00.000Z',
      partial: false,
    };
    const cache = new Map<string, SummaryEntry>([['2026-05-21|>', cached]]);
    const be = makeRecordingBackend();
    const server = createScribeMcpServer({
      backend: be.backend,
      summaryCache: cache,
      scribeSubjectFilter: '>',
      clock: () => new Date('2026-05-21T23:30:00.000Z'),
    });
    const result = await callTool(server, 'scribe.summary', {});
    const parsed = JSON.parse(result.content[0].text) as SummaryEntry;
    expect(parsed.narrative).toBe('cached narrative');
    expect(parsed.partial).toBe(false);
  });

  it('scribe.summary returns placeholder (partial=true) on cache miss when no summarizer configured', async () => {
    const be = makeRecordingBackend();
    const server = createScribeMcpServer({
      backend: be.backend,
      summaryCache: new Map(),
      scribeSubjectFilter: '>',
      clock: () => new Date('2026-05-21T23:30:00.000Z'),
    });
    const result = await callTool(server, 'scribe.summary', {
      date: '2026-05-21',
    });
    const parsed = JSON.parse(result.content[0].text) as SummaryEntry;
    expect(parsed.partial).toBe(true);
    expect(parsed.narrative).toMatch(/not yet generated/);
  });

  it('scribe.summary generates and caches on miss when summarizer is configured (C1)', async () => {
    const be = makeRecordingBackend([sampleEvent({ id: 'a' })]);
    let generateCalls = 0;
    const summarizer: Summarizer = {
      async generate(date, subject, events) {
        generateCalls++;
        return {
          date,
          subject,
          narrative: 'fresh narrative',
          eventCount: events.length,
          sourceEventIds: events.map((e) => e.id),
          generatedAt: '2026-05-21T23:00:00.000Z',
          partial: false,
        };
      },
    };
    const cache = new Map<string, SummaryEntry>();
    const server = createScribeMcpServer({
      backend: be.backend,
      summaryCache: cache,
      summarizer,
      scribeSubjectFilter: '>',
      clock: () => new Date('2026-05-21T23:00:00.000Z'),
    });

    const first = await callTool(server, 'scribe.summary', { date: '2026-05-21' });
    const parsed1 = JSON.parse(first.content[0].text) as SummaryEntry;
    expect(parsed1.narrative).toBe('fresh narrative');
    expect(generateCalls).toBe(1);

    // Second call should hit cache (C1)
    const second = await callTool(server, 'scribe.summary', { date: '2026-05-21' });
    const parsed2 = JSON.parse(second.content[0].text) as SummaryEntry;
    expect(parsed2.narrative).toBe('fresh narrative');
    expect(generateCalls).toBe(1);
  });
});
