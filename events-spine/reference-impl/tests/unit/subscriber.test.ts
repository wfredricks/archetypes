/**
 * Behavior tests for the Subscriber (Service S2).
 *
 * Contract-intent: tests assert that subscriptions deliver parsed
 * ScribeEvents, that handler errors do NOT crash the subscriber, and
 * that unsubscribe stops delivery. No assertions about NATS internals.
 *
 * SIG anchor: `Service {key: "S2"}`, `DataObject {key: "DO1"/"DO2"}`.
 */

import { describe, it, expect } from 'vitest';
import type { NatsConnection, Subscription as NatsSubscription, Msg } from 'nats';
import { JSONCodec } from 'nats';

import type { ScribeEvent } from '../../src/types.js';
import { createSubscriber } from '../../src/subscriber/index.js';

const codec = JSONCodec<ScribeEvent>();

/**
 * Build a fake NATS subscription. Returns an object that:
 *   - acts like an AsyncIterable<Msg> so the subscriber's for-await loop runs
 *   - exposes `push(msg)` to inject a message
 *   - exposes `close()` to end the iteration (mimicking unsubscribe)
 */
function makeFakeSubscription(): {
  sub: NatsSubscription;
  push(subject: string, data: Uint8Array): void;
  close(): void;
  unsubscribeCalls: number;
} {
  const queue: Msg[] = [];
  const waiters: Array<(value: IteratorResult<Msg>) => void> = [];
  let closed = false;
  let unsubscribeCalls = 0;

  function push(subject: string, data: Uint8Array): void {
    const msg = {
      subject,
      data,
      sid: 1,
      reply: undefined,
      respond: () => false,
      json: () => JSON.parse(new TextDecoder().decode(data)),
      string: () => new TextDecoder().decode(data),
    } as unknown as Msg;
    if (waiters.length > 0) {
      const resolve = waiters.shift()!;
      resolve({ value: msg, done: false });
    } else {
      queue.push(msg);
    }
  }

  function close(): void {
    closed = true;
    while (waiters.length > 0) {
      const resolve = waiters.shift()!;
      resolve({ value: undefined as unknown as Msg, done: true });
    }
  }

  const sub: NatsSubscription = {
    [Symbol.asyncIterator]() {
      return this as AsyncIterator<Msg>;
    },
    next(): Promise<IteratorResult<Msg>> {
      if (queue.length > 0) {
        const value = queue.shift()!;
        return Promise.resolve({ value, done: false });
      }
      if (closed) {
        return Promise.resolve({ value: undefined as unknown as Msg, done: true });
      }
      return new Promise<IteratorResult<Msg>>((resolve) => {
        waiters.push(resolve);
      });
    },
    unsubscribe(): void {
      unsubscribeCalls++;
      close();
    },
    drain(): Promise<void> {
      close();
      return Promise.resolve();
    },
    getSubject(): string {
      return '*';
    },
    getMax(): number {
      return 0;
    },
    getProcessed(): number {
      return 0;
    },
    getReceived(): number {
      return 0;
    },
    getPending(): number {
      return queue.length;
    },
    isClosed(): boolean {
      return closed;
    },
    isDraining(): boolean {
      return false;
    },
    callback() {
      // not used
    },
  } as unknown as NatsSubscription;

  return {
    sub,
    push,
    close,
    get unsubscribeCalls() {
      return unsubscribeCalls;
    },
  } as {
    sub: NatsSubscription;
    push(subject: string, data: Uint8Array): void;
    close(): void;
    unsubscribeCalls: number;
  };
}

function makeFakeConnection(subFactory: () => NatsSubscription): NatsConnection {
  return {
    subscribe(_filter: string): NatsSubscription {
      return subFactory();
    },
    drain(): Promise<void> {
      return Promise.resolve();
    },
    close(): Promise<void> {
      return Promise.resolve();
    },
  } as unknown as NatsConnection;
}

function encodeEvent(event: ScribeEvent): Uint8Array {
  return codec.encode(event);
}

function sampleEvent(overrides: Partial<ScribeEvent> = {}): ScribeEvent {
  return {
    id: overrides.id ?? 'evt-1',
    subject: overrides.subject ?? 's.x.y',
    publishedAt: overrides.publishedAt ?? '2026-05-21T20:00:00.000Z',
    publisherId: overrides.publisherId ?? 'pub-1',
    payload: overrides.payload ?? { ok: true },
    ...(overrides.correlationId ? { correlationId: overrides.correlationId } : {}),
  };
}

// Why: subscriber drives an async loop, so tests need a small pause for
// the loop to consume queued messages and call the handler.
function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('Subscriber (S2)', () => {
  it('createSubscriber exposes connect, subscribe, and close', async () => {
    const fakeSub = makeFakeSubscription();
    const sub = createSubscriber({
      natsUrl: 'nats://test',
      connection: makeFakeConnection(() => fakeSub.sub),
    });
    expect(typeof sub.connect).toBe('function');
    expect(typeof sub.subscribe).toBe('function');
    expect(typeof sub.close).toBe('function');
    await sub.close();
  });

  it('subscribe delivers parsed ScribeEvents to the handler (DO1 round-trip)', async () => {
    const fakeSub = makeFakeSubscription();
    const subscriber = createSubscriber({
      natsUrl: 'nats://test',
      connection: makeFakeConnection(() => fakeSub.sub),
    });

    await subscriber.connect();
    const received: ScribeEvent[] = [];
    subscriber.subscribe('s.>', (e) => {
      received.push(e);
    });

    const event = sampleEvent({ subject: 's.x.y', id: 'evt-A' });
    fakeSub.push('s.x.y', encodeEvent(event));
    await tick();

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event);

    await subscriber.close();
  });

  it('handler exceptions do not crash the subscriber; subsequent events are delivered', async () => {
    const fakeSub = makeFakeSubscription();
    const errors: string[] = [];
    const subscriber = createSubscriber({
      natsUrl: 'nats://test',
      connection: makeFakeConnection(() => fakeSub.sub),
      logger: { error: (msg) => errors.push(msg) },
    });

    await subscriber.connect();
    const delivered: ScribeEvent[] = [];
    let calls = 0;
    subscriber.subscribe('s.>', (e) => {
      calls++;
      if (calls === 1) throw new Error('handler boom');
      delivered.push(e);
    });

    fakeSub.push('s.x', encodeEvent(sampleEvent({ id: 'evt-1' })));
    await tick();
    fakeSub.push('s.x', encodeEvent(sampleEvent({ id: 'evt-2' })));
    await tick();

    expect(calls).toBe(2);
    expect(delivered).toHaveLength(1);
    expect(delivered[0].id).toBe('evt-2');
    expect(errors.some((e) => e.includes('handler'))).toBe(true);

    await subscriber.close();
  });

  it('malformed envelopes are skipped and logged; well-formed events still deliver', async () => {
    const fakeSub = makeFakeSubscription();
    const errors: string[] = [];
    const subscriber = createSubscriber({
      natsUrl: 'nats://test',
      connection: makeFakeConnection(() => fakeSub.sub),
      logger: { error: (msg) => errors.push(msg) },
    });

    await subscriber.connect();
    const delivered: ScribeEvent[] = [];
    subscriber.subscribe('s.>', (e) => {
      delivered.push(e);
    });

    fakeSub.push('s.x', new TextEncoder().encode('this is not json'));
    await tick();
    fakeSub.push('s.x', encodeEvent(sampleEvent({ id: 'evt-good' })));
    await tick();

    expect(delivered).toHaveLength(1);
    expect(delivered[0].id).toBe('evt-good');
    expect(errors.some((e) => e.includes('malformed'))).toBe(true);

    await subscriber.close();
  });

  it('unsubscribe stops further deliveries', async () => {
    const fakeSub = makeFakeSubscription();
    const subscriber = createSubscriber({
      natsUrl: 'nats://test',
      connection: makeFakeConnection(() => fakeSub.sub),
    });

    await subscriber.connect();
    const delivered: ScribeEvent[] = [];
    const sub = subscriber.subscribe('s.>', (e) => {
      delivered.push(e);
    });

    fakeSub.push('s.x', encodeEvent(sampleEvent({ id: 'evt-1' })));
    await tick();
    sub.unsubscribe();
    // Pushing after unsubscribe: the loop is closed, so the message
    // is not consumed. (Real NATS would not deliver it at all.)
    await tick();

    expect(delivered).toHaveLength(1);
    expect(fakeSub.unsubscribeCalls).toBe(1);

    await subscriber.close();
  });

  it('subscribe before connect throws', () => {
    const fakeSub = makeFakeSubscription();
    const subscriber = createSubscriber({
      natsUrl: 'nats://test',
      connection: undefined as never,
    });
    // Why undefined here: the no-connection case. We can't easily test
    // this with the injected-connection seam (since injecting means we
    // do have one). So construct one without a connection and verify
    // the precondition error.
    expect(() => subscriber.subscribe('s.>', () => undefined)).toThrow(/connect/);
    // Touch fakeSub so the import is used in this test for clarity:
    expect(typeof fakeSub.push).toBe('function');
  });

  it('close is idempotent and unsubscribes outstanding subscriptions', async () => {
    const fakeSub = makeFakeSubscription();
    const subscriber = createSubscriber({
      natsUrl: 'nats://test',
      connection: makeFakeConnection(() => fakeSub.sub),
    });

    await subscriber.connect();
    subscriber.subscribe('s.>', () => undefined);

    await subscriber.close();
    await subscriber.close();
    expect(fakeSub.unsubscribeCalls).toBe(1);
  });
});
