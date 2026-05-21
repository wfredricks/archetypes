/**
 * Re-exports for the scribe primitive.
 *
 * Reference for the `scribe` archetype, co-located with events-spine.
 * Archetype root: `../../../../scribe/ARCHETYPE.md`.
 *
 * @module scribe
 */

export type {
  Scribe,
  ScribeOptions,
  SummaryScheduler,
} from './scribe.js';
export { createScribe } from './scribe.js';

export type { ScribeBackend } from './backend-protocol.js';
export { subjectMatches, eventMatchesQuery } from './backend-protocol.js';

export type { FileBackendOptions } from './backends/file-backend.js';
export { createFileBackend } from './backends/file-backend.js';

export type { Summarizer, BedrockSummarizerOptions } from './summary.js';
export { createBedrockSummarizer, sampleEvents, placeholderSummary } from './summary.js';

export type { ScribeMcpServer, ScribeMcpServerOptions } from './mcp-server.js';
export { createScribeMcpServer, SCRIBE_TOOL_NAMES } from './mcp-server.js';
