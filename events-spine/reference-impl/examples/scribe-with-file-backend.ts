/**
 * Example: start the Scribe with the file backend on a tmp root,
 * subscribed to ">". Records every event on the bus to JSONL files
 * under the configured root.
 *
 * Run with:
 *   NATS_URL=nats://localhost:4222 SCRIBE_ROOT=/tmp/scribe-logs \
 *     npx tsx examples/scribe-with-file-backend.ts
 *
 * Pair with `publish-one-event.ts` to see the round-trip: the example
 * publisher writes; the Scribe records to `<root>/<YYYY-MM-DD>.jsonl`.
 *
 * Exercises Process Pr1 (Scribe boot → subscribe → record) and the
 * file backend (Service S6, Constraint C2).
 *
 * @module examples/scribe-with-file-backend
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createScribe,
  createFileBackend,
} from '../src/scribe/index.js';

const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';
const scribeRoot = process.env.SCRIBE_ROOT ?? join(tmpdir(), 'scribe-logs');

async function main(): Promise<void> {
  const backend = createFileBackend({ root: scribeRoot });
  const scribe = createScribe({
    natsUrl,
    backend,
  });
  await scribe.start();
  // eslint-disable-next-line no-console
  console.log(`Scribe started.`);
  // eslint-disable-next-line no-console
  console.log(`  NATS:   ${natsUrl}`);
  // eslint-disable-next-line no-console
  console.log(`  Filter: > (everything; per P1)`);
  // eslint-disable-next-line no-console
  console.log(`  Root:   ${scribeRoot}`);
  // eslint-disable-next-line no-console
  console.log(`Ctrl-C to stop.`);

  const stop = async (): Promise<void> => {
    await scribe.stop();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('scribe-with-file-backend failed:', err);
  process.exit(1);
});
