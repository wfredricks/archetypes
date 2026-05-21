/**
 * Re-exports for the publisher primitive (simple-pubsub).
 *
 * Reference for the `simple-pubsub` archetype, co-located with
 * events-spine. Archetype root: `../../../../simple-pubsub/ARCHETYPE.md`.
 *
 * @module publisher
 */

export type { Publisher, PublisherOptions, PublishInput } from './publisher.js';
export { createPublisher, decodeEnvelope } from './publisher.js';
