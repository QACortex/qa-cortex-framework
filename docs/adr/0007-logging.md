# ADR 0007 — Structured, redacting logging (`@qa-cortex/core/logger`)

- Status: accepted (Step 6A/6B, 2026-11-23). Phase 1 module 5 ("Redacting logger").
- Code: `packages/core/src/logger/`
- Tests:
  - unit tests: `packages/core/test/logger/logger.spec.ts`
  - artifact test: `packages/core/test/logger/fixtures.spec.ts`, with the nested project in `test/fixtures/pw-logger/`
  - type tests: `packages/core/test/types/logger.types.ts`
- Versions verified: `@playwright/test` 1.65.1 at runtime; every `TestInfo` field used also exists in 1.60.0

## Context
**What Playwright already provides:**
- `console.*` output captured per test and shown by every reporter. S3 found it in list, JSON, JUnit, HTML and blob reports, and in the trace.
- `testInfo.attach()`, `test.step()` and annotations.
- Screenshots, video and traces.

**What it doesn't provide:**
- log levels
- structured data
- test metadata on log entries
- any protection for secrets: what a test prints lands in every report and in the trace (ADR 0003)

## Decision
1. **`createLogger(options)`: a plain logger that works anywhere** (tests, fixtures, scripts, future API clients).
   - Levels `debug < info < warn < error`, default `info`.
   - `child(bindings)` for context.
   - A pluggable synchronous `sink`. The default prints one readable line: debug/info go to stdout, warn/error to stderr.
2. **`loggerFixtures()`: plain fixtures for the user's own `test.extend()`** (ADR 0006 pattern; type-only Playwright import).
   | Name | Scope | Kind | Default |
   |---|---|---|---|
   | `qaLog` | test | fixture (boxed) | a logger per test, stamped with the test's metadata |
   | `qaLogLevel` | worker | option | `'info'` |
   | `qaLogAttach` | worker | option: `'always' \| 'on-failure' \| 'off'` | `'on-failure'` (like `trace: 'retain-on-failure'`) |
   | `qaSecrets` | worker | fixture, **overridden in code** | `[]` |

   - **Where output goes:** every call goes to the console, which Playwright captures per test. It's also kept for a per-test `qa-cortex-log.jsonl` attachment, written at teardown according to `qaLogAttach`.
   - **Metadata on each record:** `title`, `titlePath`, `project`, `worker`, `parallelIndex`, `retry`, `testId`.
3. **Secrets come from a fixture override, never from `use`.** `use` is configuration, and configuration gets shared and printed. The future secrets loader (module 2) will provide `qaSecrets`.
4. **Redaction runs before anything is written** (console line, attachment record):
   - **Known secret values** (ADR 0003): every value of 4 characters or more is replaced with `[REDACTED]` wherever it appears, plain or URL-encoded, in messages, data and context. Longest first, so a secret containing another is redacted whole. Truncation happens *after* redaction.
   - **Sensitive key names, a second layer in addition to ADR 0003:** values under keys containing `password`, `passwd`, `secret`, `token`, `authorization`, `cookie`, `apikey`, `credential`, `privatekey` (case and separators ignored) are replaced. This over-redacts on purpose (e.g. `tokenCount`); it's defence in depth, not a substitute for value redaction.
   - **Safe serialisation:**
     - circular references
     - `Error` objects (name/message/stack, redacted)
     - `Map`, `Set`, `Date`, `URL`, `bigint`, functions
     - limits: depth 6, string 4,000 chars, array 100 items
     - the caller's data is never mutated
5. **Independent modules.** The logger never imports the config module (a test checks the built output). They're linked only by explicit mapping, e.g. `use: { qaLogLevel: qa.production ? 'info' : 'debug' }`.
6. **No logging dependency.** pino/winston bring async transports and worker threads that conflict with per-test buffering and `testInfo.attach()`. Node built-ins are enough. Zod stays core's only runtime dependency.
7. **Not done on purpose:**
   - no custom reporter
   - no wrapping of `test`, `expect` or `test.step`
   - no screenshot or trace duplication
   - no colours (reporters colour their own output; escape codes leak into files)

## Evidence
**Unit tests (16):**
- levels and record shape; `child` context
- formatting and the default sink
- redaction: plain, URL-encoded, the 4-character minimum, containment, sensitive keys at depth, `Error`, awkward types, limits, no mutation

**Nested Playwright project:** 3 projects (`default`, `always` + `debug`, `off`), 2 workers, `retries: 1`, `trace: 'on'`, combined with `configFixtures()`, with a random secret in `qaSecrets`.
- **Attachment policy:**
  - `on-failure`: only the failed attempt of the flaky test is attached
  - `always`: every attempt is attached
  - `off`: nothing is attached
- **Records:** carry the metadata, and `retry` is 1 on the retried attempt.
- **Level filtering:** works per project.
- **The secret appears nowhere,** plain or URL-encoded, in:
  - the runner output
  - the raw JSON report
  - the decoded attachments
  - the **unzipped traces**
- **Positive controls:** the redacted line *is* in the trace, and the attachments were read.
- **Mutation check:** with redaction disabled, the test fails.

**Type tests:** 6 invalid cases, each confirmed to fire. Positive checks cover inference without the generic, overriding `qaSecrets`, and composition with `configFixtures()`.

**Package guards:**
- `./logger` resolves
- every subpath can be `require()`d in plain Node (catches top-level await, ADR 0001)
- the built JS contains no runtime `@playwright/test` and no import of the config module

## Limits (documented)
- **Scope: QA Cortex logger output only.** Redaction applies to the console lines and the `qa-cortex-log.jsonl` attachment that this logger generates. It does **not** cover anything Playwright records itself:
  - traces
  - screenshots and videos
  - network traffic (trace network logs, HAR)
  - action parameters
  - assertion messages and failure output
  - reports built from any of the above

  There's no guarantee for those artifacts (ADR 0003). Keep traces off in production.
- **Known secret-value redaction is best effort.** It matches the exact value, plain or URL-encoded. It misses transformed secrets: hashed, base64-encoded, split, sliced or concatenated.
- **Short secrets are not redacted.** Values shorter than `MIN_SECRET_LENGTH` (4 characters) are ignored entirely, so a short secret passes through unredacted. This is deliberate: redacting `"a"` would wreck every line.
- **Sensitive key-name redaction is supported but heuristic.** It catches values under keys like `password`/`token`/`authorization`, and over-redacts look-alikes (`tokenCount`). It misses secrets under innocent key names, which only value redaction can catch.
- **Attachments and console output are still secret-bearing artifacts** in the ADR 0003 sense. Redaction lowers the risk; it doesn't remove the need for restricted, short-lived artifacts.
- **Sink errors propagate.** If a custom `sink` throws, the logging call (`log.info(…)` etc.) throws the same error. Nothing is swallowed, retried or buffered, and the logger keeps working for later calls. This is intended: losing logs silently is worse than a visible failure, and the built-in sinks (console plus an in-memory buffer) don't throw in practice. A covering test exists.

## Deferred
- **Output:** a JSON console mode, colours, files and transports, sampling, per-module levels, `trace`/`fatal` levels.
- **Reporting:** any custom reporter (forbidden).
- **Other modules:**
  - automatic HTTP request/response logging: the API phase
  - linking `test.step()` to log scopes
  - the secrets loader that fills `qaSecrets`: module 2
