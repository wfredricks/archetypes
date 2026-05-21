/**
 * Behavior tests for the Scribe core (Process Pr1, Principles P1/P4).
 *
 * Contract-intent: tests verify (a) default subject filter is ">", (b)
 * each received event reaches `backend.write` unchanged, (c) start/stop
 * lifecycle is clean. Translation note: assertions are about Pr1's
 * outward behavior, not nats.js internals.
 */

import { describe, it, expect } from 'vitest';

import type { ScribeEvent } from '../../src/types.js';
import { createScribe } from '../../src/scribe/index.js';
import type { ScribeBackend } from '../../src/scribe/index.js';
import type {
  Subscriber,
  EventHandler,
  Subscription,
} from '../../src/subscriber/index.js';

function makeRecordingBackend(): {
  backend: ScribeBackend;
  writes: ScribeEvent[];
  closed: boolean;
} {
  const writes: ScribeEvent[] = [];
  let closed = false;
  return {
    writes,
    get closed() {
      return closed;
    },
    backend: {
      async write(event) {
        writes.push(event);
      },
      async query() {
        return [];
      },
      async *tail() {
        // intentionally empty
      },
      async close() {
        closed = true;
      },
    },
  } as { backend: ScribeBackend; writes: ScribeEvent[]; closed: boolean };
}

function makeFakeSubscriber(): {
  subscriber: Subscriber;
  deliver(event: ScribeEvent): Promise<void>;
  capturedFilter: string | null;
  closed: boolean;
} {
  let handler: EventHandler | null = null;
  let capturedFilter: string | null = null;
  let closed = false;
  const subscriber: Subscriber = {
    async connect() {
      // no-op
    },
    subscribe(filter, h): Subscription {
      capturedFilter = filter;
      handler = h;
      return {
        unsubscribe() {
          handler = null;
        },
      };
    },
    async close() {
      closed = true;
      handler = null;
    },
  };
  return {
    subscriber,
    async deliver(event) {
      if (!handler) throw new Error('no handler subscribed');
      await handler(event);
    },
    get capturedFilter() {
      return capturedFilter;
    },
    get closed() {
      return closed;
    },
  } as {
    subscriber: Subscriber;
    deliver(event: ScribeEvent): Promise<void>;
    capturedFilter: string | null;
    closed: boolean;
  };
}

function sampleEvent(overrides: Partial<ScribeEvent> = {}): ScribeEvent {
  return {
    id: overrides.id ?? 'evt-1',
    subject: overrides.subject ?? 's.x.y',
    publishedAt: overrides.publishedAt ?? '2026-05-21T20:00:00.000Z',
    publisherId: overrides.publisherId ?? 'pub-1',
    payload: overrides.payload ?? { ok: true },
  };
}

describe('Scribe (Pr1)', () => {
  it('subscribes to ">" by default (P1)', async () => {
    const be = makeRecordingBackend();
    const fake = makeFakeSubscriber();
    const scribe = createScribe({
      natsUrl: 'nats://test',
      backend: be.backend,
      subscriber: fake.subscriber,
    });
    await scribe.start();
    expect(fake.capturedFilter).toBe('>');
    await scribe.stop();
  });

  it('uses the configured subjectFilter when provided', async () => {
    const be = makeRecordingBackend();
    const fake = makeFakeSubscriber();
    const scribe = createScribe({
      natsUrl: 'nats://test',
      backend: be.backend,
      subjectFilter: 'si.>',
      subscriber: fake.subscriber,
    });
    await scribe.start();
    expect(fake.capturedFilter).toBe('si.>');
    await scribe.stop();
  });

  it('writes every delivered event to the backend (P4: no transformation)', async () => {
    const be = makeRecordingBackend();
    const fake = makeFakeSubscriber();
    const scribe = createScribe({
      natsUrl: 'nats://test',
      backend: be.backend,
      subscriber: fake.subscriber,
    });
    await scribe.start();

    const e1 = sampleEvent({ id: 'a' });
    const e2 = sampleEvent({ id: 'b', payload: { x: 1, y: 'two' } });
    await fake.deliver(e1);
    await fake.deliver(e2);

    expect(be.writes).toHaveLength(2);
    expect(be.writes[0]).toEqual(e1);
    expect(be.writes[1]).toEqual(e2);

    await scribe.stop();
  });

  it('stop closes the subscriber and the backend (when backend.close is defined)', async () => {
    const be = makeRecordingBackend();
    const fake = makeFakeSubscriber();
    const scribe = createScribe({
      natsUrl: 'nats://test',
      backend: be.backend,
      subscriber: fake.subscriber,
    });
    await scribe.start();
    await scribe.stop();
    expect(fake.closed).toBe(true);
    expect(be.closed).toBe(true);
  });

  it('start is idempotent; second call does not double-subscribe', async () => {
    const be = makeRecordingBackend();
    const fake = makeFakeSubscriber();
    let subscribeCount = 0;
    const wrappedSubscriber: Subscriber = {
      ...fake.subscriber,
      subscribe(filter, handler) {
        subscribeCount++;
        return fake.subscriber.subscribe(filter, handler);
      },
    };
    const scribe = createScribe({
      natsUrl: 'nats://test',
      backend: be.backend,
      subscriber: wrappedSubscriber,
    });
    await scribe.start();
    await scribe.start();
    expect(subscribeCount).toBe(1);
    await scribe.stop();
  });

  it('runs the daily summary when scheduler fires (Pr2 wiring)', async () => {
    const be = makeRecordingBackend();
    // Seed the backend with events so the summarizer has something
    // to summarize when the scheduler triggers.
    await be.backend.write(sampleEvent({ id: 'a', subject: 'svc.x' }));
    const fake = makeFakeSubscriber();

    let summarizerCalls = 0;
    const summarizer = {
      async generate(date: string, subject: string, events: ScribeEvent[]) {
        summarizerCalls++;
        return {
          date,
          subject,
          narrative: `summary for ${date}`,
          eventCount: events.length,
          sourceEventIds: events.map((e) => e.id),
          generatedAt: '2026-05-21T23:00:00.000Z',
          partial: false,
        };
      },
    };

    let triggerCallback: (() => void | Promise<void>) | null = null;
    const fakeScheduler = {
      start(callback: () => void | Promise<void>) {
        triggerCallback = callback;
      },
      stop() {
        triggerCallback = null;
      },
    };

    // Override backend.query for the summary path. We do this by
    // wrapping with a closure.
    const events = [sampleEvent({ id: 'a', subject: 'svc.x' })];
    const sumBackend: ScribeBackend = {
      ...be.backend,
      async query() {
        return events;
      },
    };

    const scribe = createScribe({
      natsUrl: 'nats://test',
      backend: sumBackend,
      subscriber: fake.subscriber,
      summary: {
        enabled: true,
        summarizer,
        scheduler: fakeScheduler,
      },
    });
    await scribe.start();
    expect(triggerCallback).not.toBeNull();
    await triggerCallback!();
    expect(summarizerCalls).toBe(1);
    const today = new Date().toISOString().slice(0, 10);
    const cached = scribe.summaryCache.get(`${today}|>`);
    expect(cached?.narrative).toContain('summary for');
    expect(cached?.eventCount).toBe(1);
    await scribe.stop();
  });
});
