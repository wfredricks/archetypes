# Tests

Two suites:

## `tests/unit/`

Pure-Node, no external services. NATS is mocked via the `connection` testing
seam on `createPublisher` / `createSubscriber`. Bedrock is mocked via the
`client` option on `createBedrockSummarizer`. The file backend operates on
real disk under `os.tmpdir()` per test.

Tests are written **contract-intent**: they use only public APIs and assert
behavior that is contractually meaningful — not internal implementation
details, not specific JSON serialization byte-shapes, not mock-arrangement
trivia. When this archetype gets a Go / Python / Rust reference, this test
suite gets translated alongside the code.

If you find yourself writing a test that pokes at a private detail, the
public API probably needs to expose that detail or the test probably should
not exist.

## `tests/integration/`

Boot a real NATS server, run a real Scribe with a real file backend, drive
the publisher and verify the round-trip. Prefers a local `nats-server`
binary on the PATH; falls back to `docker run nats:2.10-alpine`. Skips
cleanly when neither is available.

The harness in `_harness.ts` is the boot/teardown unit. Each test calls
`bootIntegrationHarness()` in `try` + `finally`; the `finally` block tears
down deterministically.
