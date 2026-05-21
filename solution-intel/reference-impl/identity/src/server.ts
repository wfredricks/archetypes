/**
 * SI/I — Top-Level Hono Server
 *
 * // Why: This is the composing server for SI/I. It mounts the bangauth
 * // archetype's `/auth` router and adds SI's own endpoints: `/resolve`,
 * // `/grants`, `/grants/:grantId/revoke`, `/health`. Lifecycle (start/stop)
 * // is exported as a function so tests can boot on port 0 without leaking
 * // background processes.
 *
 * @module server
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { authRouter } from './auth/server.js';
import { resolveHandler } from './resolve.js';
import {
  grantHandler,
  revokeHandler,
  listGrantsHandler,
} from './grants-http.js';
import { VERSION } from './version.js';

/** Build the SI/I Hono app. Exported for tests that prefer Hono's `fetch` shape. */
export function buildApp(): Hono {
  const app = new Hono();

  app.use('*', cors());

  // @adopt:auth-mount-path
  // Q: Under which path does the identity router mount?
  //    Clients (CLI, browsers, other services) hit `<mount>/request-code`,
  //    `<mount>/verify-code`, `<mount>/.well-known/jwks.json`.
  // Default: /auth
  // Format: absolute path beginning with /
  // Mount the bangauth archetype under /auth
  app.route('/auth', authRouter);

  // SI/I's own endpoints
  app.post('/resolve', resolveHandler);
  app.post('/grants', grantHandler);
  app.post('/grants/:grantId/revoke', revokeHandler);
  app.get('/grants', listGrantsHandler);

  app.get('/health', (c) =>
    // @adopt:service-name
    // Q: Same service name as the boot banner; appears in /health.
    // Default: si-identity
    c.json({ ok: true, service: 'si-identity', version: VERSION }),
  );

  // @adopt:composes:eventing
  // Q: Which eventing archetype does this project compose?
  // Default: NONE in v0.1 — SI emits audit only, via the audit-ledger
  //          archetype (see src/audit.ts). Stage 2d adopts events-spine
  //          here: a NATS publisher (or equivalent) is constructed once
  //          at boot, wired into the audit emitter (so every audit event
  //          also fans out as a NATS message), and closed on shutdown.
  // Reference: archetypes/events-spine/ARCHETYPE.md
  // Notes: This is a deliberate placeholder. The eventing adoption belongs
  //        here (not inside individual handlers) because it's a single
  //        substrate-scope resource: one publisher per process, mounted at
  //        boot, shared across handlers. The audit emitter (src/audit.ts)
  //        is the natural sink to fan out to events-spine once wired.
  // Alternatives: any archetype whose contract satisfies the eventing role.
  //               Currently registered: events-spine (pending Stage 2d).


  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  return app;
}

/**
 * Handle returned by {@link startServer}, suitable for graceful teardown in
 * tests and process-level signal handlers.
 */
export interface ServerHandle {
  /** Bound TCP port (useful when port=0 was requested). */
  port: number;
  /** Close the listening socket. Resolves once the server is fully closed. */
  close(): Promise<void>;
}

/**
 * Start the SI/I server.
 *
 * // Why: A function rather than top-level side-effects so importing this
 * // module from tests does NOT bind a socket. Tests call startServer(0) and
 * // get a real bound port back.
 */
// @adopt:default-port
// Q: What TCP port does the identity service listen on by default?
//    Override at boot via the `SI_PORT` env var or by passing `port` to
//    startServer(). The CLI's default URL (cli/src/url.ts) assumes the
//    matching value; keep them in sync.
// Default: 3001
// Format: 1–65535
export async function startServer(port = 3001): Promise<ServerHandle> {
  const app = buildApp();
  const server = serve({ fetch: app.fetch, port });

  // Why: @hono/node-server returns a Node http.Server. Wait for it to
  // actually be listening before resolving so callers know the port is hot.
  await new Promise<void>((resolve) => {
    if ((server as { listening?: boolean }).listening) {
      resolve();
      return;
    }
    server.once('listening', () => resolve());
  });

  const address = server.address();
  const boundPort =
    typeof address === 'object' && address !== null ? address.port : port;

  return {
    port: boundPort,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

// ─── CLI entry point ─────────────────────────────────────────────────────────

// Why: `node dist/server.js` should just work. We use `pathToFileURL` rather
// than naive string concatenation because absolute paths can contain
// characters (spaces, unicode) that `import.meta.url` percent-encodes; a raw
// `file://${process.argv[1]}` string therefore won't match on macOS volume
// paths like `/Volumes/Mini Me/...`. Wrapped in a try so failure to import
// `node:url` (vanishingly unlikely) never crashes the import.
import { pathToFileURL } from 'node:url';

function isCliEntry(): boolean {
  if (typeof process === 'undefined') return false;
  if (!Array.isArray(process.argv) || typeof process.argv[1] !== 'string') return false;
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
}

if (isCliEntry()) {
  const port = Number(process.env.SI_PORT ?? 3001);
  startServer(port)
    .then((handle) => {
      // @adopt:service-name
      // Q: What service name appears in the boot banner and /health response?
      //    Used for log-line provenance and operator-facing diagnostics.
      // Default: si-identity
      // Format: kebab-case, [a-z][a-z0-9-]{2,31}
      console.log(`🚀 si-identity v${VERSION} listening on :${handle.port}`);
      const shutdown = async () => {
        await handle.close();
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    })
    .catch((err) => {
      console.error('Failed to start si-identity:', err);
      process.exit(1);
    });
}
