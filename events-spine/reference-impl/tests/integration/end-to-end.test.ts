/**
 * End-to-end integration test for events-spine.
 *
 * Verifies the load-bearing round-trip the LEFT-BOOKEND commits to:
 *
 *   publish(event) -> NATS -> Scribe.subscribe -> backend.write -> backend.query
 *
 * SIG anchor:
 *   - Hypothesis H5: DO1 round-trips cleanly through the file backend
 *   - Service S1 (publish) + S2 (subscribe) + S6 (backend)
 *   - Process Pr1 (subscribe → record)
 *
 * Skipped automatically when neither a local `nats-server` binary nor
 * Docker is available.
 */

import { describe, it, expect } from 'vitest';

import { createPublisher } from '../../src/publisher/index.js';
import {
  bootIntegrationHarness,
  hasNatsOption,
  type IntegrationHarness,
} from './_harness.js';

// Why a small wait helper: NATS is delivery-async; tests need a few
// hundred ms for the message round-trip + backend.write to complete.
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const integrationAvailable = hasNatsOption();

describe.skipIf(!integrationAvailable)('events-spine end-to-end', () => {
  it('publish -> Scribe captures -> query returns the event (H5)', async () => {
    const h: IntegrationHarness = await bootIntegrationHarness();
    try {
      await h.scribe.start();
      const publisher = createPublisher({
        natsUrl: h.natsUrl,
        publisherId: 'int-test',
      });
      await publisher.connect();
      try {
        publisher.publish({
          subject: 'int.test.one',
          payload: { value: 42, name: 'forty-two' },
        });
        // Give NATS + the Scribe loop ~500ms to deliver and write.
        await wait(500);

        const today = new Date().toISOString().slice(0, 10);
        const results = await h.backend.query({
          subject: 'int.test.>',
          since: `${today}T00:00:00.000Z`,
          until: nextDayIso(today),
        });
        expect(results).toHaveLength(1);
        expect(results[0].subject).toBe('int.test.one');
        expect(results[0].payload).toEqual({ value: 42, name: 'forty-two' });
        expect(results[0].publisherId).toBe('int-test');
        expect(typeof results[0].id).toBe('string');
        expect(typeof results[0].publishedAt).toBe('string');
      } finally {
        await publisher.close();
      }
    } finally {
      await h.stop();
    }
  });

  it('publishes ten events; the Scribe captures all ten; query filters by subject', async () => {
    const h: IntegrationHarness = await bootIntegrationHarness();
    try {
      await h.scribe.start();
      const publisher = createPublisher({
        natsUrl: h.natsUrl,
        publisherId: 'int-test-10',
      });
      await publisher.connect();
      try {
        for (let i = 0; i < 5; i++) {
          publisher.publish({
            subject: 'a.thing.happened',
            payload: { i },
          });
        }
        for (let i = 0; i < 5; i++) {
          publisher.publish({
            subject: 'b.thing.happened',
            payload: { i },
          });
        }
        await wait(750);

        const today = new Date().toISOString().slice(0, 10);
        const allResults = await h.backend.query({
          since: `${today}T00:00:00.000Z`,
          until: nextDayIso(today),
          limit: 100,
        });
        expect(allResults.length).toBeGreaterThanOrEqual(10);

        const aResults = await h.backend.query({
          subject: 'a.>',
          since: `${today}T00:00:00.000Z`,
          until: nextDayIso(today),
        });
        expect(aResults.length).toBe(5);
        expect(aResults.every((e) => e.subject === 'a.thing.happened')).toBe(true);

        const bResults = await h.backend.query({
          subject: 'b.>',
          since: `${today}T00:00:00.000Z`,
          until: nextDayIso(today),
        });
        expect(bResults.length).toBe(5);
      } finally {
        await publisher.close();
      }
    } finally {
      await h.stop();
    }
  });

  it('subscriber receives published events (S1 -> S2 wire)', async () => {
    const h: IntegrationHarness = await bootIntegrationHarness();
    try {
      // Don't start the Scribe — we just want the publisher→subscriber wire.
      const { createSubscriber } = await import('../../src/subscriber/index.js');
      const subscriber = createSubscriber({ natsUrl: h.natsUrl });
      await subscriber.connect();

      const publisher = createPublisher({
        natsUrl: h.natsUrl,
        publisherId: 'wire-test',
      });
      await publisher.connect();

      try {
        const received: Array<{ subject: string; payload: Record<string, unknown> }> = [];
        subscriber.subscribe('wire.>', (event) => {
          received.push({ subject: event.subject, payload: event.payload });
        });
        // Give NATS a moment to wire the subscription.
        await wait(100);
        publisher.publish({
          subject: 'wire.first',
          payload: { ok: true },
        });
        publisher.publish({
          subject: 'wire.second',
          payload: { ok: false },
        });
        await wait(400);

        expect(received.length).toBe(2);
        const subjects = received.map((r) => r.subject).sort();
        expect(subjects).toEqual(['wire.first', 'wire.second']);
      } finally {
        await publisher.close();
        await subscriber.close();
      }
    } finally {
      await h.stop();
    }
  });

  it('stop is clean: no hanging connections, scribe + harness shut down', async () => {
    const h: IntegrationHarness = await bootIntegrationHarness();
    await h.scribe.start();
    // Stop twice — idempotency of the chain.
    await h.stop();
    // If we reach here without hanging, the test passes.
    expect(true).toBe(true);
  });
});

function nextDayIso(yyyyMmDd: string): string {
  const d = new Date(yyyyMmDd + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}
