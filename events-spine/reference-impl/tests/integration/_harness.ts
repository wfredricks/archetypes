/**
 * Integration test harness for events-spine.
 *
 * Boots a real `nats-server` (preferring a local binary at
 * `nats-server` on the PATH; falling back to `docker run nats:2.10-alpine`)
 * on a random port, then constructs a Scribe + file-backend with a tmp
 * root. Returns a teardown function that drains the Scribe, kills the
 * NATS process, and removes the tmp directory.
 *
 * // Why prefer the local binary: the local nats-server starts in
 * // ~100ms versus several seconds for `docker run`. CI runners without
 * // a local binary fall back to Docker. If neither is available, the
 * // harness throws with a clear reason and the integration tests
 * // skip rather than hang.
 *
 * @module tests/integration/_harness
 */

import { spawn, type ChildProcess, execSync } from 'node:child_process';
import { createServer, connect as netConnect } from 'node:net';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createFileBackend } from '../../src/scribe/index.js';
import { createScribe, type Scribe } from '../../src/scribe/index.js';
import type { ScribeBackend } from '../../src/scribe/index.js';

export interface IntegrationHarness {
  natsUrl: string;
  tmpRoot: string;
  backend: ScribeBackend;
  scribe: Scribe;
  stop(): Promise<void>;
}

/**
 * Pick a free TCP port. Note that there is a small TOCTOU window
 * between releasing this port and a child process binding it; in
 * practice this is fine for an integration harness on a single host.
 */
async function pickFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (typeof address === 'object' && address && 'port' in address) {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close();
        reject(new Error('could not determine free port'));
      }
    });
  });
}

function hasLocalNatsServer(): boolean {
  try {
    execSync('command -v nats-server', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasDocker(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function waitForNatsReady(port: number, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await new Promise<void>((resolve, reject) => {
        const conn = netConnect({ port, host: '127.0.0.1' });
        conn.once('connect', () => {
          conn.end();
          resolve();
        });
        conn.once('error', (e: Error) => reject(e));
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`NATS did not become ready on port ${port} within ${timeoutMs}ms`);
}

interface ServerHandle {
  url: string;
  port: number;
  stop(): Promise<void>;
}

async function bootLocalNats(): Promise<ServerHandle> {
  const port = await pickFreePort();
  const proc = spawn('nats-server', ['-p', String(port), '-a', '127.0.0.1'], {
    stdio: 'ignore',
  });
  // Why: if the binary errors immediately we want to know.
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const onExit = (code: number | null) => {
      if (!settled) {
        settled = true;
        reject(new Error(`nats-server exited prematurely with code ${code}`));
      }
    };
    proc.once('exit', onExit);
    proc.once('error', (e) => {
      if (!settled) {
        settled = true;
        reject(e);
      }
    });
    // Give the binary 250ms to settle, then resolve unless it exited.
    setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.off('exit', onExit);
        resolve();
      }
    }, 250);
  });
  await waitForNatsReady(port);
  return {
    url: `nats://127.0.0.1:${port}`,
    port,
    stop: async () => {
      if (!proc.killed) {
        proc.kill('SIGTERM');
        await waitExit(proc, 2000);
      }
    },
  };
}

async function bootDockerNats(): Promise<ServerHandle> {
  const port = await pickFreePort();
  const containerName = `events-spine-int-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const proc = spawn(
    'docker',
    [
      'run',
      '--rm',
      '--name',
      containerName,
      '-p',
      `127.0.0.1:${port}:4222`,
      'nats:2.10-alpine',
    ],
    { stdio: 'ignore' },
  );
  // Wait for nats to bind
  await waitForNatsReady(port, 20_000);
  return {
    url: `nats://127.0.0.1:${port}`,
    port,
    stop: async () => {
      try {
        execSync(`docker kill ${containerName}`, { stdio: 'ignore' });
      } catch {
        // already gone
      }
      if (!proc.killed) {
        proc.kill('SIGTERM');
        await waitExit(proc, 2000);
      }
    },
  };
}

function waitExit(proc: ChildProcess, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const t = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {
        // ignore
      }
      resolve();
    }, timeoutMs);
    proc.once('exit', () => {
      clearTimeout(t);
      resolve();
    });
  });
}

/**
 * Boot a Scribe attached to a real NATS server and a real file
 * backend. Throws if no NATS server can be booted (no local binary,
 * no Docker); callers use `try` + `describe.skip` to handle the
 * environment gracefully.
 */
export async function bootIntegrationHarness(): Promise<IntegrationHarness> {
  let server: ServerHandle;
  if (hasLocalNatsServer()) {
    server = await bootLocalNats();
  } else if (hasDocker()) {
    server = await bootDockerNats();
  } else {
    throw new Error(
      'No NATS server available — install nats-server locally or run Docker to enable integration tests.',
    );
  }

  const tmpRoot = await fs.mkdtemp(join(tmpdir(), 'events-spine-int-'));
  const backend = createFileBackend({ root: tmpRoot });
  const scribe = createScribe({
    natsUrl: server.url,
    backend,
  });

  return {
    natsUrl: server.url,
    tmpRoot,
    backend,
    scribe,
    stop: async () => {
      await scribe.stop();
      await server.stop();
      await fs.rm(tmpRoot, { recursive: true, force: true });
    },
  };
}

/**
 * Convenience: synchronous pre-flight check used by `describe.skipIf`
 * patterns so the integration tests skip cleanly when no NATS option
 * is available.
 *
 * On GitHub Actions runners (`process.env.CI === 'true'`) Docker is
 * usually available but `docker run nats` can race past the readiness
 * wait, surfacing a flaky red instead of a clean skip. When CI is set
 * and no local NATS server is reachable, we treat this as "no NATS
 * option available" and let the suite skip; adopters who want CI to
 * exercise NATS must stand up a real server in their workflow.
 *
 * // Why: lifted from SI/I Stage 2d (the first adopter); having it
 * // here means every subsequent adopter inherits the CI-aware skip
 * // for free.
 */
export function hasNatsOption(): boolean {
  if (process.env.CI === 'true' && !hasLocalNatsServer()) return false;
  return hasLocalNatsServer() || hasDocker();
}
