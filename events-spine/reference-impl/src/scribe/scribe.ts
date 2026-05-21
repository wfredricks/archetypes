/**
 * Scribe reference — the canonical subscriber.
 *
 * Realizes Process Pr1 from the events-spine SIG Contract: boot →
 * subscribe → record. Composes a Subscriber (S2) and a ScribeBackend
 * (S6); records every event the configured subject filter matches.
 *
 * SIG anchor:
 *   - Process Pr1 ("Scribe boot → subscribe → record") — this module
 *   - Principle P1 (complete record by default — subject filter
 *     defaults to ">")
 *   - Principle P4 (reporter, not editor — no transformation; events
 *     reach the backend unchanged)
 *   - Service S3/S4/S5 (the MCP server, optional) — wired via
 *     mcp-server.ts when enabled in options
 *   - Process Pr2 (daily summary) — wired via summary.ts when enabled
 *
 * // Why factor the Subscriber into the Scribe rather than re-implement:
 * // the Subscriber primitive is the substrate; the Scribe is one
 * // canonical instance of it. Composing avoids duplicate parse logic.
 *
 * @module scribe/scribe
 */

import type { ScribeEvent, SubjectFilter, SummaryEntry } from '../types.js';
import { createSubscriber, type Subscriber, type Subscription, type SubscriberLogger } from '../subscriber/index.js';
import type { ScribeBackend } from './backend-protocol.js';
import type { Summarizer } from './summary.js';

/**
 * Options accepted by `createScribe`. Only `backend` is required; the
 * Scribe defaults to subscribing to `>` (P1) and running without the
 * summary or MCP server unless explicitly enabled.
 */
export interface ScribeOptions {
  /** NATS URL. Required (the Scribe needs a bus). */
  natsUrl: string;
  /** Backend implementation. Required. */
  backend: ScribeBackend;
  /**
   * NATS subject filter. Defaults to `>` per P1 ("complete record by
   * default"). Adopters who want filtered logging pass their filter.
   */
  subjectFilter?: SubjectFilter;
  /** Optional logger for substrate errors. */
  logger?: SubscriberLogger;
  /**
   * Optional summary configuration. When enabled, the Scribe runs Pr2
   * (daily summary) at the configured hour.
   */
  summary?: {
    enabled: boolean;
    summarizer: Summarizer;
    /** Local hour (0-23) at which the daily run fires. Default 23. */
    hourLocal?: number;
    /**
     * Optional override for the scheduler used for tests. When
     * provided, replaces setInterval-based scheduling.
     */
    scheduler?: SummaryScheduler;
  };
  /**
   * Testing seam: inject the Subscriber. When provided, the Scribe
   * uses it instead of constructing one.
   */
  subscriber?: Subscriber;
}

/** Public Scribe surface — start, stop, plus accessors for the MCP server. */
export interface Scribe {
  /** Connect to the bus and begin recording. */
  start(): Promise<void>;
  /** Drain the bus subscription and close the backend if it supports close. */
  stop(): Promise<void>;
  /**
   * Read-only access to the backend the Scribe is writing to. The MCP
   * server (S3/S4) forwards to this backend.
   */
  backend: ScribeBackend;
  /**
   * In-memory summary cache. Keyed by `${date}|${subjectFilter}`.
   * Read by the MCP server's `scribe.summary` tool (S5).
   */
  summaryCache: Map<string, SummaryEntry>;
}

/**
 * Scheduler abstraction for Pr2 (daily summary). Production uses the
 * default setInterval-based implementation; tests inject a fake to
 * trigger the daily run synchronously.
 */
export interface SummaryScheduler {
  start(callback: () => void | Promise<void>, hourLocal: number): void;
  stop(): void;
}

function makeIntervalScheduler(): SummaryScheduler {
  let handle: NodeJS.Timeout | null = null;
  return {
    start(callback, hourLocal): void {
      // Why poll every 5 minutes rather than computing the exact
      // next-fire time: simpler and resilient to clock drift,
      // sleep/wake, and DST. We fire once per local day at the
      // configured hour and remember the date.
      let lastFiredDate: string | null = null;
      handle = setInterval(
        () => {
          const now = new Date();
          if (now.getHours() === hourLocal) {
            const today = now.toISOString().slice(0, 10);
            if (lastFiredDate !== today) {
              lastFiredDate = today;
              void callback();
            }
          }
        },
        5 * 60 * 1000,
      );
    },
    stop(): void {
      if (handle) {
        clearInterval(handle);
        handle = null;
      }
    },
  };
}

/**
 * Construct a Scribe. See `createPublisher` for factory-form rationale.
 */
export function createScribe(options: ScribeOptions): Scribe {
  const subjectFilter = options.subjectFilter ?? '>';
  const summaryCache = new Map<string, SummaryEntry>();

  // Why allow inversion-of-control on the subscriber: tests want to
  // drive subscription delivery directly. Adopters use the default.
  const subscriber: Subscriber =
    options.subscriber ??
    createSubscriber({
      natsUrl: options.natsUrl,
      logger: options.logger,
    });

  let started = false;
  let subscription: Subscription | null = null;
  let scheduler: SummaryScheduler | null = null;

  async function start(): Promise<void> {
    if (started) return;
    started = true;
    await subscriber.connect();
    subscription = subscriber.subscribe(subjectFilter, async (event: ScribeEvent) => {
      // Why P4 (reporter, not editor): no transformation here. We
      // hand the event to the backend exactly as parsed.
      await options.backend.write(event);
    });

    if (options.summary?.enabled) {
      const sched = options.summary.scheduler ?? makeIntervalScheduler();
      scheduler = sched;
      const summarizer = options.summary.summarizer;
      const hour = options.summary.hourLocal ?? 23;
      sched.start(async () => {
        await runDailySummary(summarizer);
      }, hour);
    }
  }

  async function runDailySummary(summarizer: Summarizer): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `${today}|${subjectFilter}`;
    if (summaryCache.has(cacheKey)) return;
    const events = await options.backend.query({
      subject: subjectFilter,
      since: `${today}T00:00:00.000Z`,
      until: `${nextDay(today)}T00:00:00.000Z`,
      limit: 10_000,
    });
    const entry = await summarizer.generate(today, subjectFilter, events);
    summaryCache.set(cacheKey, entry);
  }

  async function stop(): Promise<void> {
    if (!started) return;
    started = false;
    if (scheduler) {
      scheduler.stop();
      scheduler = null;
    }
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
    await subscriber.close();
    if (options.backend.close) {
      await options.backend.close();
    }
  }

  return {
    start,
    stop,
    backend: options.backend,
    summaryCache,
  };
}

function nextDay(yyyyMmDd: string): string {
  const d = new Date(yyyyMmDd + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
