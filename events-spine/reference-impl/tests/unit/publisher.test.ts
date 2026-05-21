/**
 * Behavior tests for the Publisher (Service S1, Principle P3).
 *
 * Contract-intent: tests assert the publisher's externally-visible
 * behavior — envelope shape, fire-and-forget semantics, close idempotence
 * — using only the public factory and the parser. No assertions about
 * internal fields that would not survive translation to Go/Python/Rust.
 *
 * SIG anchor: `Service {key: "S1"}` (events-spine), `Principle {key: "P3"}`,
 * `DataObject {key: "DO1"}`, `Constraint {key: "C5"}`.
 */

import { describe, it, expect } from 'vitest';
import type { NatsConnection } from 'nats';

import { createPublisher, decodeEnvelope } from '../../src/publisher/index.js';

/**
 * Fake NATS connection that records publishes. Used as the test seam
 * (injected via PublisherOptions.connection) so unit tests do not
 * require a real NATS server.
 */
function makeFakeConnection(): {
  connection: NatsConnection;
  recorded: Array<{ subject: string; bytes: Uint8Array }>;
  drained: boolean;
} {
  const recorded: Array<{ subject: string; bytes: Uint8Array }> = [];
  let drained = false;
  const connection = {
    publish(subject: string, data: Uint8Array): void {
      recorded.push({ subject, bytes: data });
    },
    drain(): Promise<void> {
      drained = true;
      return Promise.resolve();
    },
    close(): Promise<void> {
      return Promise.resolve();
    },
  } as unknown as NatsConnection;
  return {
    connection,
    recorded,
    get drained() {
      return drained;
    },
  } as { connection: NatsConnection; recorded: Array<{ subject: string; bytes: Uint8Array }>; drained: boolean };
}

describe('Publisher (S1)', () => {
  it('createPublisher returns an object exposing publish, publishPayload, connect, and close', () => {
    const fake = makeFakeConnection();
    const pub = createPublisher({
      natsUrl: 'nats://test',
      publisherId: 'test-pub',
      connection: fake.connection,
    });
    expect(typeof pub.publish).toBe('function');
    expect(typeof pub.publishPayload).toBe('function');
    expect(typeof pub.connect).toBe('function');
    expect(typeof pub.close).toBe('function');
  });

  it('publish wraps the input in a canonical ScribeEvent envelope (DO1)', () => {
    const fake = makeFakeConnection();
    const pub = createPublisher({
      natsUrl: 'nats://test',
      publisherId: 'test-pub',
      idGenerator: () => 'fixed-id-001',
      clock: () => '2026-05-21T20:00:00.000Z',
      connection: fake.connection,
    });

    pub.publish({
      subject: 'si.identity.login.completed',
      payload: { email: 'a@b.test' },
    });

    expect(fake.recorded).toHaveLength(1);
    expect(fake.recorded[0].subject).toBe('si.identity.login.completed');

    const envelope = decodeEnvelope(fake.recorded[0].bytes);
    expect(envelope.id).toBe('fixed-id-001');
    expect(envelope.subject).toBe('si.identity.login.completed');
    expect(envelope.publishedAt).toBe('2026-05-21T20:00:00.000Z');
    expect(envelope.publisherId).toBe('test-pub');
    expect(envelope.payload).toEqual({ email: 'a@b.test' });
    expect(envelope.correlationId).toBeUndefined();
  });

  it('publish carries correlationId when provided', () => {
    const fake = makeFakeConnection();
    const pub = createPublisher({
      natsUrl: 'nats://test',
      publisherId: 'test-pub',
      connection: fake.connection,
    });

    pub.publish({
      subject: 'svc.thing.happened',
      payload: { ok: true },
      correlationId: 'corr-42',
    });

    const envelope = decodeEnvelope(fake.recorded[0].bytes);
    expect(envelope.correlationId).toBe('corr-42');
  });

  it('publish honors caller-supplied envelope fields when present', () => {
    const fake = makeFakeConnection();
    const pub = createPublisher({
      natsUrl: 'nats://test',
      publisherId: 'default-pub',
      connection: fake.connection,
    });

    pub.publish({
      subject: 'svc.x.y',
      payload: { v: 1 },
      id: 'caller-id',
      publisherId: 'caller-pub',
      publishedAt: '2020-01-01T00:00:00.000Z',
    });

    const envelope = decodeEnvelope(fake.recorded[0].bytes);
    expect(envelope.id).toBe('caller-id');
    expect(envelope.publisherId).toBe('caller-pub');
    expect(envelope.publishedAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('publishPayload uses defaultSubject when no subject argument is provided', () => {
    const fake = makeFakeConnection();
    const pub = createPublisher({
      natsUrl: 'nats://test',
      publisherId: 'test-pub',
      defaultSubject: 'svc.default.subject',
      connection: fake.connection,
    });

    pub.publishPayload({ a: 1 });

    expect(fake.recorded[0].subject).toBe('svc.default.subject');
  });

  it('publishPayload throws when neither a subject argument nor defaultSubject is configured', () => {
    const fake = makeFakeConnection();
    const pub = createPublisher({
      natsUrl: 'nats://test',
      publisherId: 'test-pub',
      connection: fake.connection,
    });

    expect(() => pub.publishPayload({ a: 1 })).toThrow(/defaultSubject/);
  });

  it('publish does not block on subscriber acknowledgement (P3: fire-and-forget)', () => {
    // Behavior: the fake connection records the call synchronously and
    // returns void; publish() must complete without awaiting anything
    // subscriber-side. Translation note: this test asserts that publish
    // is synchronous from the caller's perspective (no Promise returned).
    const fake = makeFakeConnection();
    const pub = createPublisher({
      natsUrl: 'nats://test',
      publisherId: 'test-pub',
      connection: fake.connection,
    });

    const result = pub.publish({ subject: 's.x', payload: {} });
    expect(result).toBeUndefined();
  });

  it('publish throws after close', async () => {
    const fake = makeFakeConnection();
    const pub = createPublisher({
      natsUrl: 'nats://test',
      publisherId: 'test-pub',
      connection: fake.connection,
    });
    await pub.close();
    // Injected connection: close does not drain the caller-owned conn,
    // but the publisher tracks its own closed flag.
    expect(() => pub.publish({ subject: 's.x', payload: {} })).toThrow(/close/);
  });

  it('close is idempotent', async () => {
    const fake = makeFakeConnection();
    const pub = createPublisher({
      natsUrl: 'nats://test',
      publisherId: 'test-pub',
      connection: fake.connection,
    });
    await pub.close();
    await pub.close();
    // No throw == idempotent. Translation note: close() returning a
    // Promise that resolves on the second call is the contract.
    expect(true).toBe(true);
  });
});
