/**
 * Daily-summary reference — realizes Process Pr2 (daily summary) and
 * Service S5 (`scribe.summary`).
 *
 * SIG anchor:
 *   - Process Pr2 ("Daily summary generation")
 *   - Service S5 (`scribe.summary` MCP tool — surface in mcp-server.ts;
 *     this module is the LLM-call layer)
 *   - Constraint C1 (one LLM call per `(subject, date)` per day —
 *     enforced via the Scribe's summary cache; this module is
 *     side-effect-pure with respect to caching)
 *
 * Default model: `us.anthropic.claude-haiku-4-5-20251001-v1:0`
 * (per LEFT-BOOKEND.md §V Pr2 implementation note).
 *
 * // Why an interface (`Summarizer`) on top of the concrete factory:
 * // tests want a deterministic, no-network summarizer. The interface
 * // is the seam. Adopters who want CloudWatch-AI or a local model
 * // implement the same interface.
 *
 * @module scribe/summary
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

import type { ScribeEvent, SubjectFilter, SummaryEntry } from '../types.js';

const DEFAULT_MODEL = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
const DEFAULT_MAX_EVENTS_IN_PROMPT = 500;
const SAMPLE_BUCKET_SIZE = 100;

/**
 * Summarizer interface. Adopters substitute alternative LLM backends
 * by implementing `generate`.
 */
export interface Summarizer {
  generate(
    date: string,
    subjectFilter: SubjectFilter,
    events: ScribeEvent[],
  ): Promise<SummaryEntry>;
}

export interface BedrockSummarizerOptions {
  /** Bedrock model id. Default: Claude Haiku per LEFT-BOOKEND.md Pr2. */
  model?: string;
  /**
   * Max events the prompt may contain. Default 500. Beyond this, the
   * generator samples (first / middle / last buckets).
   */
  maxEventsInPrompt?: number;
  /** Optional Bedrock client (testing seam). */
  client?: BedrockRuntimeClient;
  /** Optional clock override (testing). */
  clock?: () => Date;
}

/**
 * Construct a Bedrock-backed summarizer. The default model is Claude
 * Haiku; override via options. Honors C1 only in concert with the
 * Scribe's cache — this function itself is callable repeatedly and
 * will hit Bedrock each time; the cache lives in `Scribe.summaryCache`.
 */
export function createBedrockSummarizer(
  options: BedrockSummarizerOptions = {},
): Summarizer {
  const model = options.model ?? DEFAULT_MODEL;
  const maxEvents = options.maxEventsInPrompt ?? DEFAULT_MAX_EVENTS_IN_PROMPT;
  const client = options.client ?? new BedrockRuntimeClient({});
  const clock = options.clock ?? (() => new Date());

  return {
    async generate(
      date: string,
      subjectFilter: SubjectFilter,
      events: ScribeEvent[],
    ): Promise<SummaryEntry> {
      if (events.length === 0) {
        return {
          date,
          subject: subjectFilter,
          narrative: `No events recorded for ${date} matching filter "${subjectFilter}".`,
          eventCount: 0,
          sourceEventIds: [],
          generatedAt: clock().toISOString(),
          partial: false,
        };
      }

      const { sampled, sampledNote } = sampleEvents(events, maxEvents);

      // Why a structured prompt with explicit instruction: Haiku
      // produces tighter narrative when handed the events as JSON and
      // told to write one short paragraph. We don't ask for markdown
      // structure (defer to caller).
      const prompt = [
        `You are summarizing one day of events from a constellation's event bus.`,
        `Date: ${date}.`,
        `Subject filter: ${subjectFilter}.`,
        sampledNote ? `Note: ${sampledNote}` : '',
        ``,
        `Events (JSON):`,
        JSON.stringify(sampled, null, 2),
        ``,
        `Write ONE short paragraph (2-4 sentences) in plain English. Plain prose. No markdown.`,
      ]
        .filter((s) => s.length > 0)
        .join('\n');

      const body = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      };

      const command = new InvokeModelCommand({
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(JSON.stringify(body)),
      });

      const response = await client.send(command);
      const responseText = new TextDecoder().decode(response.body);
      const parsed = JSON.parse(responseText) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const narrative =
        parsed.content?.find((c) => c.type === 'text')?.text?.trim() ??
        `Summary generation returned no narrative for ${date}.`;

      return {
        date,
        subject: subjectFilter,
        narrative: sampledNote ? `${narrative}\n\n(${sampledNote})` : narrative,
        eventCount: events.length,
        sourceEventIds: sampled.map((e) => e.id),
        generatedAt: clock().toISOString(),
        partial: false,
      };
    },
  };
}

/**
 * Sample events when there are more than `maxEvents`: take the first
 * SAMPLE_BUCKET_SIZE, the middle SAMPLE_BUCKET_SIZE, and the last
 * SAMPLE_BUCKET_SIZE. Returns the sampled events plus a human-readable
 * note describing the sampling, or no note when no sampling was needed.
 */
export function sampleEvents(
  events: ScribeEvent[],
  maxEvents: number,
): { sampled: ScribeEvent[]; sampledNote: string | null } {
  if (events.length <= maxEvents) {
    return { sampled: events, sampledNote: null };
  }
  const total = events.length;
  const bucket = Math.min(SAMPLE_BUCKET_SIZE, Math.floor(maxEvents / 3));
  const first = events.slice(0, bucket);
  const midStart = Math.floor(total / 2) - Math.floor(bucket / 2);
  const middle = events.slice(midStart, midStart + bucket);
  const last = events.slice(total - bucket);
  const sampled = [...first, ...middle, ...last];
  const sampledNote = `Summary based on sampled ${sampled.length} of ${total} events (first/middle/last buckets).`;
  return { sampled, sampledNote };
}

/**
 * Placeholder summary entry — what S5 returns when the cache misses
 * and the summary has not been generated.
 *
 * // Why this lives here: the Scribe's MCP server (mcp-server.ts)
 * // returns this on cache-miss; co-locating with the rest of the
 * // summary logic keeps the placeholder contract in one place.
 */
export function placeholderSummary(
  date: string,
  subjectFilter: SubjectFilter,
  generatedAt: string,
): SummaryEntry {
  return {
    date,
    subject: subjectFilter,
    narrative: `Summary not yet generated for ${date} matching filter "${subjectFilter}".`,
    eventCount: 0,
    sourceEventIds: [],
    generatedAt,
    partial: true,
  };
}
