/**
 * Example: connect, subscribe to `example.>`, log received events,
 * run until SIGINT.
 *
 * Run with:
 *   NATS_URL=nats://localhost:4222 npx tsx examples/subscribe-and-handle.ts
 *
 * Exercises Service S2 (subscribe). Pair with publish-one-event.ts in
 * another terminal to see the wire end-to-end.
 *
 * @module examples/subscribe-and-handle
 */

import { createSubscriber } from '../src/subscriber/index.js';

const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';

async function main(): Promise<void> {
  const subscriber = createSubscriber({ natsUrl });
  await subscriber.connect();

  subscriber.subscribe('example.>', (event) => {
    // eslint-disable-next-line no-console
    console.log(
      `[${event.publishedAt}] ${event.subject} from ${event.publisherId}: ${JSON.stringify(
        event.payload,
      )}`,
    );
  });

  // eslint-disable-next-line no-console
  console.log(`Subscribed to "example.>" on ${natsUrl}. Ctrl-C to exit.`);

  const stop = async (): Promise<void> => {
    await subscriber.close();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('subscribe-and-handle failed:', err);
  process.exit(1);
});
