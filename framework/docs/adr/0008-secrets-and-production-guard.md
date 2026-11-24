# ADR 0008 — Secrets loader and Production guard (`@qa-cortex/core/secrets`, `@qa-cortex/core/guard`)

- Status: accepted (Step 9B design and implementation, 2026-11-24). Phase 1 module 2 ("Secrets loader and Production guard"). Builds on ADR 0003 (artifact leak matrix) and ADR 0007 (logger `qaSecrets` contract).
- Code: `packages/core/src/secrets/`, `packages/core/src/guard/`
- Tests:
  - unit tests: `packages/core/test/secrets/secrets.spec.ts`, `packages/core/test/guard/check.spec.ts`
  - fixture tests: `packages/core/test/secrets/fixtures.spec.ts` (nested project `test/fixtures/pw-secrets/`) and `packages/core/test/guard/fixtures.spec.ts` (nested project `test/fixtures/pw-guard/`)
  - type tests: `packages/core/test/types/secrets.types.ts`, `packages/core/test/types/guard.types.ts`
  - packed-package consumers: `compat/consumer/` (probes, type-check, fixtures in Chromium)
- Versions verified: `@playwright/test` 1.65.1 (runtime and nested runs); consumer type-check and Chromium run on 1.60.0 and 1.65.1 (Windows, Node 26.13.1, locally). Every Playwright API used (`WorkerFixture`, `PlaywrightWorkerOptions`, `workerInfo.config.reporter`, the `trace`/`video`/`screenshot` option fixtures, `TEST_WORKER_INDEX`) predates 1.60.

## Context
- ADR 0003: traces, videos, screenshots and HTML/blob reports can contain secrets, and configuration cannot stop a revealed value from being recorded. Production runs must keep these artifacts off.
- ADR 0007: the logger redacts values it is given through the `qaSecrets` worker fixture, and secrets must come from code, never from `use`.
- Playwright has no typed secrets loading, no per-profile secret names and no production check.

## Decision

### Two independent subpaths
`@qa-cortex/core/secrets` and `@qa-cortex/core/guard`. Neither imports the config, logger or each other (a package test enforces this for every module). Fixtures meet other modules through fixture **names** only.

### Secrets (`./secrets`)
- `defineSecrets({ name: { env, optional?, allowShort?, description? } })`. `env` is one variable name, or a map from profile to variable name (profiles the map leaves out have no such secret). A `const` type parameter keeps literal types.
- `loadSecrets(def, { profile, env? })`: synchronous (usable in `playwright.config.ts`), reads `process.env` by default, and throws one `SecretsError` listing every issue: unset, empty, shorter than 4 characters, invalid variable name, empty map. Messages name the secret and variable, never a value; an invalid variable name is not printed either, in case a value was pasted there.
- `SecretStore`: `get(name)` only for secrets present in every profile (typed: not `optional`, single variable name); `find(name)` for any secret, returning `Secret | undefined`; `has()`, `names()`, `profile`. **No method returns the list of raw values** (Step 9B correction 4).
- `Secret`: the value sits in a `#private` field; `String()`, template literals, `+`, `JSON.stringify` and `util.inspect` give `[REDACTED]` (`Secret(name) [REDACTED]` for inspect); `reveal()` is the only way to the value. TypeScript refuses a `Secret` where a string is expected, and the type-aware lint rules (`restrict-template-expressions`, `restrict-plus-operands`) flag it in templates.
- Values shorter than 4 characters are rejected unless `allowShort: true`: the logger ignores them when redacting (ADR 0007).
- `secretsFixtures(def)`: worker fixtures `qaSecretStore` (profile from `qaConfig.profile`) and `qaSecrets` (the logger's redaction list, filled through an internal accessor). It must come **after** `loggerFixtures()`: both define `qaSecrets`, and Playwright uses the last definition.
- **Composition check** (Step 9B follow-up, Option A): `secretsFixtures()` also adds `qaSecretsCheck`, a worker-scoped **auto** fixture that compares the *effective* `qaSecrets` with the loaded secrets once per worker, before any test. If any loaded value is missing (logger applied after secrets by chained `extend()`, spread or `mergeTests()`, or a user override that drops values), the worker fails with a `SecretsError` that names the secrets and how to fix the order, never a value. Overrides that keep the loaded values and add their own pass. Options considered and rejected: a shared global registry read by the logger (hidden coupling, changes logger behaviour), an additive `qaSecrets` (does not fix logger-after-secrets), a combined helper (couples the modules), a static check (the config cannot see fixture composition). True order-independence would need one module to know the other.
- Consequence of the check: every worker of a test that uses `secretsFixtures()` loads its secrets, even when its tests never use them, so a missing **required** secret fails all of them. Mark secrets that only some tests need `optional` and read them with `find()`.
- No `.env` parser and no new dependency: projects use Node's own `process.loadEnvFile()` / `--env-file`. `.env` and `.env.*` are gitignored; only `.env.example` (placeholders) is committed.
- Secrets never go into the config schema: a config object is ordinary, printable data.

### Production guard (`./guard`)
It checks and never changes settings (ADR 0003). With `production: true`:
- `trace` and `video` must be `"off"`; `screenshot` must be `"off"`, or `"only-on-failure"`/`"on-first-failure"` with `allowScreenshotsOnFailure: true`. String and `{ mode }` forms are read; unset means Playwright's default `"off"`; any other value (a future mode, a malformed object) fails closed.
- HTML and blob reporters: a warning by default, `reporters: 'error'` or `'ignore'` on request.

Two layers:
1. **Static**, `assertProductionSafe(config, { production })` in `playwright.config.ts`: checks every project's effective `use` (project over root), or the root `use` without projects, and the reporters. Throws `ProductionGuardError` listing every violation before any worker starts. Warnings go to `options.warn`, or `console.warn` in the main process only (`TEST_WORKER_INDEX` unset). `checkProductionSafety()` is the pure form returning `GuardViolation[]`, so future packages can add checks by composition (no plugin loader).
2. **Runtime**, `productionGuardFixtures()`: worker-scoped **auto** fixture `qaProductionGuard` that reads Playwright's own `trace`, `video` and `screenshot` option fixtures and `workerInfo.config.reporter`, with `production` from `qaConfig.production`. It reports errors only (reporter warnings are the static layer's job, unless `reporters: 'error'`).

The fixtures declare their dependencies (`qaConfig`, Playwright options) as function arguments with Playwright's public `WorkerFixture` type rather than through `Fixtures<…, PW>`, which would turn `qaConfig` into an overridable key and clash with the real one.

## Evidence (verified before and during implementation)
Spike on `@playwright/test` 1.65.1, then the integration tests above:

| Question | Result |
|---|---|
| Does a worker-scoped auto fixture see config `use`, project `use`, CLI `--trace on`, `test.use({ trace })` and CLI `--reporter`? | Yes, all five. |
| Does it run before the browser? | Yes. When it throws, `DEBUG=pw:api` shows no `browserType.launch` and no `newContext`; with the guard off, the same run shows the launch (control test). The blocked tests request `page`, and framework CI installs no browser, so a late guard would fail differently. |
| Before worker fixtures a test requests? | Yes: a worker fixture requested by the test was never set up. |
| Artifacts of a blocked worker | No video, screenshots or browser data. See the limitation below for the test-runner trace. |
| `mergeTests()` of a logger test and a secrets test | Works: `qaSecrets` holds the loaded values. |
| Wrong composition: logger after secrets by chained `extend()`, spread or `mergeTests()`, or an override that drops values | `qaSecretsCheck` fails all four in both profiles before any test body runs (8 of 8 failed, no body output). With traces on and every log attached, no secret value appears in the output, JSON report, attachments or traces. |
| Secrets without the logger; an override that adds values | Both run. |

## Limits (documented)
- **Test-runner trace for blocked tests.** With `--trace on` or `test.use({ trace })`, Playwright still writes a `trace.zip` for the blocked test. It contains only `test.trace` (hook names, output written by fixtures set up earlier, the guard's error) and the test source files: no browser, page or network data. The static check prevents this for settings in the config file; CLI and `test.use` overrides are only caught at run time.
- **Fixture order is not automatic.** Composition still depends on order, but the wrong order now fails explicitly (`qaSecretsCheck`) instead of silently disabling redaction.
- **Secrets in assertions leak.** Playwright records `expect()` arguments in traces and reports. While writing these tests, a `expect(secret.reveal()).toBe(...)` put a value into a trace; the artifact search caught it. Compare secrets as booleans, or not at all.
- **Not detected:** UI mode (`--ui`) and `PWDEBUG` sessions, which can record traces outside the option fixtures; tracing or video started by test code itself (`context.tracing.start()`, `newContext({ recordVideo })`); explicit `page.screenshot()` calls.
- **`production: true` is self-declared.** A production URL in a profile not marked `production` is not caught.
- **Revealed values are ordinary strings.** `Secret` protects only the object. Whatever receives `reveal()` (a `fill()`, a header, a URL) can record it, including traces (ADR 0003). The design makes disclosure explicit; it does not prevent it.
- **The environment stays readable** by all code in the process and by child processes (for example `webServer`). The loader does not clear variables: workers need them.
- `qaSecrets` is a fixture, so a test that requests it can read every value. It exists for the logger contract; tests should use `qaSecretStore`.
- `process.loadEnvFile()` was checked on Node 26.13.1 only (no warning, existing variables win over the file).

## Considered and not done
- **Production run confirmation** (for example `QA_CORTEX_CONFIRM_PRODUCTION=1`). Not built; recorded for a later decision.
- **Rewriting the config** to make it safe: rejected (ADR 0003, "do not wrap").
- **Detecting CLI flags by reading `process.argv`** in the static check: rejected; it is not a Playwright API, and the runtime fixture covers it.
- **Async secret providers** (vaults, cloud secret managers): deferred. The synchronous `env` source keeps `playwright.config.ts` free of top-level await (ADR 0001); a later async loader can reuse `SecretStore` and `Secret`.

## Seams for Phase 2 and 3 (not implemented)
- **API package:** tokens are `Secret`s read from a `SecretStore` and revealed only where a request header is set. API-specific production checks (for example, no write requests) can return `GuardViolation`s through the same pure-function pattern.
- **AI package:** provider keys are secrets as well. A future agent layer can refer to secrets by name (`names()`) instead of value. This ADR makes no claim that QA Cortex prevents secrets from reaching prompts; that needs its own design.
