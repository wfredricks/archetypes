/**
 * Public surface for `@solution-intelligence/events-spine-reference`.
 *
 * // Why a barrel: adopters derive from this reference impl by copying
 * // source files into their own tree (per METHODOLOGY.md "adoption" —
 * // not by adding an npm dependency). The barrel keeps the public type
 * // and factory surface in one place so adopters know which symbols
 * // are contract-surface vs. internal helpers.
 *
 * @module events-spine
 */

export type {
  ScribeEvent,
  SubjectFilter,
  QueryFilter,
  TailFilter,
  SummaryEntry,
} from './types.js';

export type {
  Publisher,
  PublisherOptions,
} from './publisher/index.js';
export { createPublisher } from './publisher/index.js';

export type {
  Subscriber,
  SubscriberOptions,
  Subscription,
  EventHandler,
} from './subscriber/index.js';
export { createSubscriber } from './subscriber/index.js';

export type {
  Scribe,
  ScribeOptions,
  ScribeBackend,
  Summarizer,
} from './scribe/index.js';
export {
  createScribe,
  createFileBackend,
  createBedrockSummarizer,
  createScribeMcpServer,
} from './scribe/index.js';
