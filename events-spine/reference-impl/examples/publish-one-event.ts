/**
 * Example: connect, publish one event, exit cleanly.
 *
 * Run with:
 *   NATS_URL=nats://localhost:4222 npx tsx examples/publish-one-event.ts
 *
 * This example exercises Service S1 (publish). It does NOT include
 * Scribe; pair it with `examples/scribe-with-file-backend.ts` to see
 * the full publish → Scribe → log loop.
 *
 * Honors Constraint C5: the payload contains no credentials.
 *
 * @module examples/publish-one-event
 */

import { createPublisher } from '../src/publisher/index.js';

const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';

async function main(): Promise<void> {
  const publisher = createPublisher({
    natsUrl,
    publisherId: 'example-publisher',
  });
  await publisher.connect();
  publisher.publish({
    subject: 'example.hello',
    payload: { message: 'hello, market square', at: new Date().toISOString() },
  });
  // eslint-disable-next-line no-console
  console.log(`Published one event on subject "example.hello" to ${natsUrl}.`);
  await publisher.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('publish-one-event failed:', err);
  process.exit(1);
});
