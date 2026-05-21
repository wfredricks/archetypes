/**
 * Subscriber reference — realizes Service S2 from the events-spine SIG
 * Contract.
 *
 * SIG anchor:
 *   `Service {key: "S2", contractId: "events-spine-v0.1.0-pre"}` —
 *   signature `subscribe(filter: SubjectFilter, handler: EventHandler): Subscription`.
 *
 * Honors:
 *   - DO1 (`ScribeEvent` shape): incoming bytes parsed via the
 *     publisher's `decodeEnvelope`.
 *   - DO2 (`SubjectFilter`): NATS-style filters.
 *   - "Substrate-grade fail-safe": handler exceptions are caught and
 *     logged via the configured logger; the subscriber stays alive.
 *
 * // Why pass a logger instead of using `console.error` directly:
 * // adopters route logs through their own logging stack. Defaulting
 * // to `console.error` keeps the primitive runnable out-of-the-box
 * // while allowing structured-logging adopters to plug in.
 *
 * @module subscriber/subscriber
 */

import { connect, type NatsConnection, type Subscription as NatsSubscription } from 'nats';

import type { ScribeEvent, SubjectFilter } from '../types.js';
import { decodeEnvelope } from '../publisher/index.js';

/**
 * Logger shape accepted by the subscriber. Minimal by design — anything
 * with an `error` method satisfies it (matches `console`).
 */
export interface SubscriberLogger {
  error(message: string, meta?: unknown): void;
}

/** Handler invoked for each successfully parsed event. */
export type EventHandler = (event: ScribeEvent) => void | Promise<void>;

/**
 * Options for `createSubscriber`.
 *
 * `connection` is the testing seam (mirrors the publisher); inject a
 * fake NATS connection to test without standing up a real server.
 */
export interface SubscriberOptions {
  /** NATS server URL. Required unless `connection` is injected. */
  natsUrl: string;
  /** Optional logger; defaults to `console`. */
  logger?: SubscriberLogger;
  /** Optional injected NATS connection (test seam). */
  connection?: NatsConnection;
}

/**
 * Returned by `subscribe`. The caller invokes `unsubscribe()` to stop
 * receiving messages on the registered filter.
 */
export interface Subscription {
  /** Stop delivering messages for this filter. Idempotent. */
  unsubscribe(): void;
}

/**
 * Subscriber Service surface (S2).
 *
 * `subscribe` registers a handler against a subject filter. The handler
 * is invoked for each event arriving on a subject matching the filter.
 * Handler exceptions are caught — they do NOT crash the subscriber.
 *
 * `close` drains and disconnects the underlying NATS connection. Safe
 * to call multiple times.
 */
export interface Subscriber {
  connect(): Promise<void>;
  subscribe(filter: SubjectFilter, handler: EventHandler): Subscription;
  close(): Promise<void>;
}

/**
 * Construct a Subscriber. See `createPublisher` for the rationale on
 * factory-form rather than class-form.
 */
export function createSubscriber(options: SubscriberOptions): Subscriber {
  const logger = options.logger ?? console;
  const ownsConnection = options.connection === undefined;

  let connection: NatsConnection | null = options.connection ?? null;
  let connectPromise: Promise<void> | null = null;
  let closed = false;
  const subscriptions = new Set<NatsSubscription>();

  async function ensureConnected(): Promise<NatsConnection> {
    if (connection) return connection;
    if (!connectPromise) {
      connectPromise = (async () => {
        const c = await connect({ servers: options.natsUrl });
        connection = c;
      })();
    }
    await connectPromise;
    if (!connection) {
      throw new Error('Subscriber: failed to acquire NATS connection');
    }
    return connection;
  }

  function startConsumeLoop(natsSub: NatsSubscription, handler: EventHandler): void {
    // Why a fire-and-forget async loop (no await on the returned
    // Promise): subscribers are long-lived background consumers; the
    // for-await drives until the subscription is closed. Errors are
    // caught per-message so one bad envelope does not terminate the
    // loop.
    (async () => {
      for await (const message of natsSub) {
        let event: ScribeEvent;
        try {
          event = decodeEnvelope(message.data);
        } catch (parseError) {
          logger.error('Subscriber: dropping malformed envelope', {
            subject: message.subject,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
          continue;
        }
        try {
          await handler(event);
        } catch (handlerError) {
          // Why: P4 (reporter, not editor) and the substrate-grade
          // contract together demand that one bad handler not take
          // down the listener. We log and continue.
          logger.error('Subscriber: handler threw; continuing', {
            subject: event.subject,
            eventId: event.id,
            error: handlerError instanceof Error ? handlerError.message : String(handlerError),
          });
        }
      }
    })().catch((loopError) => {
      // Why: if the loop itself rejects (subscription torn down by the
      // server, etc.), log; the subscription object is already
      // unusable by then.
      logger.error('Subscriber: consume loop exited', {
        error: loopError instanceof Error ? loopError.message : String(loopError),
      });
    });
  }

  return {
    async connect(): Promise<void> {
      await ensureConnected();
    },
    subscribe(filter: SubjectFilter, handler: EventHandler): Subscription {
      if (closed) {
        throw new Error('Subscriber: cannot subscribe after close()');
      }
      if (!connection) {
        throw new Error('Subscriber: connect() must be awaited before subscribe()');
      }
      const natsSub = connection.subscribe(filter);
      subscriptions.add(natsSub);
      startConsumeLoop(natsSub, handler);
      return {
        unsubscribe(): void {
          // Why try/catch: nats.js throws if the subscription is
          // already closed; we want idempotence.
          try {
            natsSub.unsubscribe();
          } catch {
            // already unsubscribed
          }
          subscriptions.delete(natsSub);
        },
      };
    },
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      for (const sub of subscriptions) {
        try {
          sub.unsubscribe();
        } catch {
          // ignore
        }
      }
      subscriptions.clear();
      if (ownsConnection && connection) {
        try {
          await connection.drain();
        } catch {
          // ignore
        }
        connection = null;
      }
    },
  };
}
