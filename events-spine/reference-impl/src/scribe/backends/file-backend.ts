/**
 * File backend reference — realizes the `ScribeBackend` contract (S6)
 * with one JSONL file per UTC day.
 *
 * SIG anchor:
 *   - Service S6 (`ScribeBackend`)
 *   - Constraint C2 (file backend supports rotation by day)
 *   - Principle P2 (canonical event format; backend adapts)
 *
 * Layout:
 *   <root>/2026-05-21.jsonl
 *   <root>/2026-05-22.jsonl
 *   ...
 *
 * Each line is a single `JSON.stringify(ScribeEvent)` ending in `\n`.
 *
 * // Why JSONL (not a single JSON array): JSONL is append-friendly. A
 * // crash mid-write at worst leaves an incomplete trailing line that
 * // the query path skips per the backend contract.
 *
 * // Why per-day files (not a single file with rotation policy): C2
 * // pins the rotation to date boundaries — matches the daily-summary
 * // cadence, simplifies retention ("delete files older than N days"),
 * // and makes "yesterday" a file-level concept.
 *
 * @module scribe/backends/file-backend
 */

import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';

import type { ScribeEvent, QueryFilter, TailFilter } from '../../types.js';
import { type ScribeBackend, eventMatchesQuery } from '../backend-protocol.js';

export interface FileBackendOptions {
  /** Root directory for the per-day JSONL files. Created if missing. */
  root: string;
  /**
   * Optional override for "today" — testing seam. Default: real time.
   *
   * // Why: tests that exercise day-rotation need a fake clock; the
   * // backend exposes the seam rather than the test reaching around
   * // it.
   */
  clock?: () => Date;
}

const DEFAULT_QUERY_LIMIT = 100;
const DEFAULT_TAIL_LAST = 20;

/**
 * Construct a file backend. Factory form per the publisher precedent.
 */
export function createFileBackend(options: FileBackendOptions): ScribeBackend {
  const clock = options.clock ?? (() => new Date());
  const root = options.root;

  async function ensureRoot(): Promise<void> {
    await fs.mkdir(root, { recursive: true });
  }

  function dateForEvent(event: ScribeEvent): string {
    // Why slice on the ISO string: `event.publishedAt` is ISO-8601 UTC
    // by contract; the first 10 chars are the YYYY-MM-DD date in UTC.
    // Falling back to `new Date(event.publishedAt).toISOString()` would
    // re-parse and re-normalize — same answer in the happy path, but
    // would mask broken publisher timestamps.
    return event.publishedAt.slice(0, 10);
  }

  function fileForDate(date: string): string {
    return join(root, `${date}.jsonl`);
  }

  async function readEventsForDate(date: string): Promise<ScribeEvent[]> {
    const path = fileForDate(date);
    let raw: string;
    try {
      raw = await fs.readFile(path, 'utf8');
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'ENOENT') return [];
      throw err;
    }
    const lines = raw.split('\n');
    const events: ScribeEvent[] = [];
    for (const line of lines) {
      if (line.length === 0) continue;
      try {
        const parsed = JSON.parse(line) as ScribeEvent;
        events.push(parsed);
      } catch {
        // Why skip silently here (rather than logger.warn): the
        // backend protocol says "Tolerate corrupt or partial records
        // by skipping them; backends MUST NOT throw." The Scribe
        // upstream of this layer surfaces a warning when first
        // observed; per-line spam from a partially-written file
        // would not help.
        continue;
      }
    }
    return events;
  }

  function* dateRange(since?: string, until?: string): Generator<string> {
    // Why "today and yesterday" as the default range when no bounds: a
    // tail-style read should not need to scan every file in the root.
    // Callers can pass explicit since/until to widen.
    const today = clock().toISOString().slice(0, 10);
    if (since && until) {
      // Walk day-by-day inclusive of `since`, exclusive of `until`.
      const start = new Date(since.slice(0, 10) + 'T00:00:00.000Z');
      const end = new Date(until.slice(0, 10) + 'T00:00:00.000Z');
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        yield d.toISOString().slice(0, 10);
      }
      return;
    }
    if (since) {
      const start = new Date(since.slice(0, 10) + 'T00:00:00.000Z');
      const end = new Date(today + 'T00:00:00.000Z');
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        yield d.toISOString().slice(0, 10);
      }
      return;
    }
    if (until) {
      const end = new Date(until.slice(0, 10) + 'T00:00:00.000Z');
      // Why arbitrary 30-day floor when only `until` is set: backend
      // does not know the earliest event. The Scribe could pass an
      // explicit `since` when needed; we cap reads to keep this safe.
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 30);
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        yield d.toISOString().slice(0, 10);
      }
      return;
    }
    // No bounds: yield today and yesterday only.
    const todayDate = new Date(today + 'T00:00:00.000Z');
    const yesterday = new Date(todayDate);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yield yesterday.toISOString().slice(0, 10);
    yield today;
  }

  return {
    async write(event: ScribeEvent): Promise<void> {
      const date = dateForEvent(event);
      const path = fileForDate(date);
      await fs.mkdir(dirname(path), { recursive: true });
      // Why a serialized append rather than tmp-file-and-rename:
      // append-mode is the canonical JSONL primitive; a crash leaves
      // at worst a truncated trailing line, which the reader skips.
      // The atomic-write trade-off costs throughput we don't need.
      const line = JSON.stringify(event) + '\n';
      await fs.appendFile(path, line, 'utf8');
    },

    async query(filter: QueryFilter): Promise<ScribeEvent[]> {
      await ensureRoot();
      const limit = filter.limit ?? DEFAULT_QUERY_LIMIT;
      const events: ScribeEvent[] = [];
      for (const date of dateRange(filter.since, filter.until)) {
        const dayEvents = await readEventsForDate(date);
        for (const event of dayEvents) {
          if (eventMatchesQuery(event, filter)) {
            events.push(event);
          }
        }
      }
      events.sort((a, b) => (a.publishedAt < b.publishedAt ? -1 : 1));
      return events.slice(0, limit);
    },

    async *tail(filter: TailFilter): AsyncIterable<ScribeEvent> {
      await ensureRoot();
      const last = filter.last ?? DEFAULT_TAIL_LAST;
      // Why two days of context (today + yesterday): handles the
      // common "show me recent" use case across the midnight boundary
      // without scanning the whole root.
      const today = clock().toISOString().slice(0, 10);
      const todayDate = new Date(today + 'T00:00:00.000Z');
      const yesterday = new Date(todayDate);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const collected: ScribeEvent[] = [];
      for (const date of [yesterdayStr, today]) {
        const dayEvents = await readEventsForDate(date);
        for (const event of dayEvents) {
          if (
            filter.subject === undefined ||
            eventMatchesQuery(event, { subject: filter.subject })
          ) {
            collected.push(event);
          }
        }
      }
      collected.sort((a, b) => (a.publishedAt < b.publishedAt ? -1 : 1));
      const slice = collected.slice(-last);
      for (const event of slice) {
        yield event;
      }
    },
  };
}
