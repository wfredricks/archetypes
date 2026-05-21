/**
 * Behavior tests for the daily-summary module (Pr2 / S5).
 *
 * Contract-intent: tests verify empty-events placeholder, sampling
 * threshold behavior, and the Bedrock summarizer's prompt-shape via a
 * mocked client. No real Bedrock calls.
 */

import { describe, it, expect } from 'vitest';
import type { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

import type { ScribeEvent } from '../../src/types.js';
import {
  createBedrockSummarizer,
  placeholderSummary,
  sampleEvents,
} from '../../src/scribe/summary.js';

function sampleEvent(overrides: Partial<ScribeEvent> = {}): ScribeEvent {
  return {
    id: overrides.id ?? 'evt-1',
    subject: overrides.subject ?? 's.x.y',
    publishedAt: overrides.publishedAt ?? '2026-05-21T20:00:00.000Z',
    publisherId: overrides.publisherId ?? 'pub-1',
    payload: overrides.payload ?? { ok: true },
  };
}

function makeFakeClient(narrative: string): BedrockRuntimeClient {
  return {
    async send() {
      return {
        body: new TextEncoder().encode(
          JSON.stringify({ content: [{ type: 'text', text: narrative }] }),
        ),
      };
    },
  } as unknown as BedrockRuntimeClient;
}

describe('sampleEvents', () => {
  it('returns the full array when under the threshold', () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      sampleEvent({ id: `e${i}` }),
    );
    const { sampled, sampledNote } = sampleEvents(events, 500);
    expect(sampled).toHaveLength(10);
    expect(sampledNote).toBeNull();
  });

  it('samples first/middle/last buckets when over the threshold', () => {
    const events = Array.from({ length: 1000 }, (_, i) =>
      sampleEvent({ id: `e${i}` }),
    );
    const { sampled, sampledNote } = sampleEvents(events, 300);
    expect(sampled.length).toBeLessThanOrEqual(300);
    expect(sampled.length).toBeGreaterThan(0);
    expect(sampledNote).toMatch(/Summary based on sampled/);
    // First bucket includes e0; last includes e999.
    expect(sampled[0].id).toBe('e0');
    expect(sampled[sampled.length - 1].id).toBe('e999');
  });
});

describe('placeholderSummary', () => {
  it('marks partial=true and includes the date and filter', () => {
    const placeholder = placeholderSummary(
      '2026-05-21',
      'si.>',
      '2026-05-21T20:00:00.000Z',
    );
    expect(placeholder.partial).toBe(true);
    expect(placeholder.narrative).toContain('2026-05-21');
    expect(placeholder.narrative).toContain('si.>');
    expect(placeholder.eventCount).toBe(0);
    expect(placeholder.sourceEventIds).toEqual([]);
  });
});

describe('createBedrockSummarizer', () => {
  it('returns a placeholder-style entry when there are no events', async () => {
    const summarizer = createBedrockSummarizer({
      client: makeFakeClient('unused'),
      clock: () => new Date('2026-05-21T23:00:00.000Z'),
    });
    const entry = await summarizer.generate('2026-05-21', 'svc.>', []);
    expect(entry.partial).toBe(false);
    expect(entry.eventCount).toBe(0);
    expect(entry.narrative).toMatch(/No events recorded/);
    expect(entry.date).toBe('2026-05-21');
  });

  it('generates a SummaryEntry from non-empty events using the (mocked) Bedrock response', async () => {
    const events = [
      sampleEvent({ id: 'a', subject: 'svc.x' }),
      sampleEvent({ id: 'b', subject: 'svc.y' }),
    ];
    const summarizer = createBedrockSummarizer({
      client: makeFakeClient('Two events happened.'),
      clock: () => new Date('2026-05-21T23:00:00.000Z'),
    });
    const entry = await summarizer.generate('2026-05-21', 'svc.>', events);
    expect(entry.partial).toBe(false);
    expect(entry.eventCount).toBe(2);
    expect(entry.narrative).toContain('Two events happened.');
    expect(entry.sourceEventIds).toEqual(['a', 'b']);
    expect(entry.date).toBe('2026-05-21');
    expect(entry.subject).toBe('svc.>');
  });

  it('annotates the narrative when sampling was applied', async () => {
    const events = Array.from({ length: 800 }, (_, i) =>
      sampleEvent({ id: `e${i}` }),
    );
    const summarizer = createBedrockSummarizer({
      maxEventsInPrompt: 300,
      client: makeFakeClient('Lots of things.'),
    });
    const entry = await summarizer.generate('2026-05-21', '>', events);
    expect(entry.narrative).toContain('Lots of things.');
    expect(entry.narrative).toContain('sampled');
    expect(entry.eventCount).toBe(800);
  });
});
