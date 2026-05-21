/**
 * Smoke test for `@solution-intelligence/graph-client`.
 *
 * // Why: Stage 2c ships a scaffold only. There is no implementation to
 * // exercise yet, but we still want CI to prove that the package
 * // compiles, the test runner picks up tests, and the entrypoint
 * // module loads without throwing. Stage 3 will replace this with
 * // real unit tests covering the SIGraphClient surface.
 */

import { describe, it, expect } from 'vitest';

describe('@solution-intelligence/graph-client scaffold', () => {
  it('imports the package entrypoint without throwing', async () => {
    const mod = await import('../src/index.js');
    expect(mod).toBeDefined();
    // Why: Stage 2c exports nothing; Stage 3 fills this in. Asserting an
    // empty (but defined) module keeps the test honest about current
    // state without claiming surface that does not exist.
    expect(Object.keys(mod)).toEqual([]);
  });
});
