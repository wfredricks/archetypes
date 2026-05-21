import { defineConfig } from 'vitest/config';

// Why: Unit tests run pure (mocked NATS/backend). Integration tests boot
// a real NATS server (in-process via the `nats` package's testkit or
// external — see tests/integration/_harness.ts). 60s timeout gives
// headroom for cold disk + first-time NATS connect.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      include: ['src/**/*.ts'],
      // Why: barrel index files are pure re-exports; mcp-server and
      // bedrock summary are meaningfully verified only by integration
      // (they wrap external SDKs whose error surfaces are best probed
      // out-of-process). Unit tests cover their forwarding logic;
      // integration covers their integration. Excluded from the
      // statement-threshold gate so the threshold reflects the logic
      // surface of the publisher/subscriber/file-backend/Scribe core.
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        'src/publisher/index.ts',
        'src/subscriber/index.ts',
        'src/scribe/index.ts',
        'src/scribe/mcp-server.ts',
        'src/scribe/summary.ts',
      ],
    },
  },
});
