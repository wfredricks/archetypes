/**
 * Re-exports for the subscriber primitive (simple-subscriber).
 *
 * Reference for the `simple-subscriber` archetype, co-located with
 * events-spine. Archetype root: `../../../../simple-subscriber/ARCHETYPE.md`.
 *
 * @module subscriber
 */

export type {
  Subscriber,
  SubscriberOptions,
  Subscription,
  EventHandler,
  SubscriberLogger,
} from './subscriber.js';
export { createSubscriber } from './subscriber.js';
