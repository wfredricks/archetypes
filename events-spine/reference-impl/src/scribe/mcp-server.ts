/**
 * Scribe MCP server reference — realizes Services S3, S4, S5.
 *
 * SIG anchor:
 *   - Service S3 (`scribe.query` MCP tool)
 *   - Service S4 (`scribe.tail` MCP tool)
 *   - Service S5 (`scribe.summary` MCP tool)
 *   - Principle P5 (the MCP surface IS the contract; backends are
 *     implementation)
 *   - Constraint C3 (uses standard MCP protocol)
 *
 * // Why use the official `@modelcontextprotocol/sdk` rather than
 * // hand-roll: C3 demands standard MCP. The SDK provides the JSON-RPC
 * // shape, the tool-registration model, and stdio/sse transports for
 * // free. Translations to Go/Python use the corresponding MCP SDK.
 *
 * @module scribe/mcp-server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

import type { ScribeBackend } from './backend-protocol.js';
import { placeholderSummary, type Summarizer } from './summary.js';
import type { ScribeEvent, SubjectFilter, SummaryEntry } from '../types.js';

export interface ScribeMcpServerOptions {
  /** The backend the Scribe is writing to. */
  backend: ScribeBackend;
  /**
   * In-memory summary cache shared with the Scribe. The MCP server
   * reads it for `scribe.summary` and writes through `summarizer.generate`
   * on cache misses (subject to C1 — the cache is the gate).
   */
  summaryCache: Map<string, SummaryEntry>;
  /**
   * Optional summarizer. When present, `scribe.summary` will generate on
   * cache miss; when absent, cache misses return a placeholder.
   */
  summarizer?: Summarizer;
  /** Subject filter the Scribe is subscribed to (informs summary). */
  scribeSubjectFilter: SubjectFilter;
  /** Optional override clock (testing). */
  clock?: () => Date;
}

export interface ScribeMcpServer {
  /** The underlying MCP `Server` (exposed for tests / advanced wiring). */
  server: Server;
  /** Connect the server to a transport (stdio / sse / etc.). */
  connect(transport: Transport): Promise<void>;
  /** Close the server. */
  close(): Promise<void>;
}

const TOOL_NAMES = ['scribe.query', 'scribe.tail', 'scribe.summary'] as const;

/**
 * Construct a Scribe MCP server. The caller chooses a transport
 * (stdio, sse, etc.) and calls `connect(transport)` to start serving.
 */
export function createScribeMcpServer(options: ScribeMcpServerOptions): ScribeMcpServer {
  const clock = options.clock ?? (() => new Date());
  const server = new Server(
    {
      name: 'events-spine-scribe',
      version: '0.1.0-pre',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: [
        {
          name: 'scribe.query',
          description:
            'Query the Scribe log by NATS subject filter, time range, and free-text regex over the payload.',
          inputSchema: {
            type: 'object',
            properties: {
              subject: { type: 'string', description: 'NATS-style subject filter' },
              since: { type: 'string', description: 'ISO-8601 inclusive lower bound' },
              until: { type: 'string', description: 'ISO-8601 exclusive upper bound' },
              match: { type: 'string', description: 'Regex applied to JSON-serialized payload' },
              limit: { type: 'number', description: 'Max events to return' },
            },
          },
        },
        {
          name: 'scribe.tail',
          description: 'Return the most-recent events matching subject filter.',
          inputSchema: {
            type: 'object',
            properties: {
              subject: { type: 'string', description: 'NATS-style subject filter' },
              last: { type: 'number', description: 'Number of recent events to return' },
            },
          },
        },
        {
          name: 'scribe.summary',
          description:
            'Return the daily narrative summary for date + subject filter. Cached per (subject, date) per day (C1).',
          inputSchema: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'YYYY-MM-DD (UTC). Defaults to today.' },
              subject: {
                type: 'string',
                description: 'NATS-style subject filter. Defaults to the Scribe-configured filter.',
              },
            },
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    if (name === 'scribe.query') {
      const events = await options.backend.query({
        subject: stringOr(args.subject, undefined),
        since: stringOr(args.since, undefined),
        until: stringOr(args.until, undefined),
        match: stringOr(args.match, undefined),
        limit: numberOr(args.limit, undefined),
      });
      return jsonContent(events);
    }

    if (name === 'scribe.tail') {
      const tailEvents: ScribeEvent[] = [];
      const iter = options.backend.tail({
        subject: stringOr(args.subject, undefined),
        last: numberOr(args.last, undefined),
      });
      for await (const e of iter) {
        tailEvents.push(e);
      }
      return jsonContent(tailEvents);
    }

    if (name === 'scribe.summary') {
      const today = clock().toISOString().slice(0, 10);
      const date = stringOr(args.date, today);
      const subject = stringOr(args.subject, options.scribeSubjectFilter);
      const cacheKey = `${date}|${subject}`;
      const cached = options.summaryCache.get(cacheKey);
      if (cached) return jsonContent(cached);

      if (!options.summarizer) {
        const placeholder = placeholderSummary(date, subject, clock().toISOString());
        return jsonContent(placeholder);
      }

      // Why we generate on demand here even though Pr2 normally fires
      // daily: an MCP caller asking for an un-generated date is the
      // operator's signal that the gist is wanted now. C1 still holds
      // — the cache write below makes this a one-time cost per
      // (subject, date).
      const events = await options.backend.query({
        subject,
        since: `${date}T00:00:00.000Z`,
        until: `${nextDayIso(date)}T00:00:00.000Z`,
        limit: 10_000,
      });
      const entry = await options.summarizer.generate(date, subject, events);
      options.summaryCache.set(cacheKey, entry);
      return jsonContent(entry);
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  return {
    server,
    async connect(transport: Transport): Promise<void> {
      await server.connect(transport);
    },
    async close(): Promise<void> {
      await server.close();
    },
  };
}

/** Tool names this server registers — exported for tests. */
export const SCRIBE_TOOL_NAMES = TOOL_NAMES;

function stringOr(value: unknown, fallback: string): string;
function stringOr(value: unknown, fallback: undefined): string | undefined;
function stringOr(value: unknown, fallback: string | undefined): string | undefined {
  return typeof value === 'string' ? value : fallback;
}

function numberOr(value: unknown, fallback: number | undefined): number | undefined {
  return typeof value === 'number' ? value : fallback;
}

function jsonContent(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  };
}

function nextDayIso(yyyyMmDd: string): string {
  const d = new Date(yyyyMmDd + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
