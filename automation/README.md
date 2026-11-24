# QA Cortex automation project

A ready-to-use Playwright automation project built on `@qa-cortex/core`: one typed
configuration with environment **profiles**, switched with **`QA_CORTEX_PROFILE`**, validated
before any test runs, a readable **`ConfigError`** when something is wrong, **structured,
redacting logging** (`qaLog`) visible in the terminal and in Playwright's HTML report, **typed
secrets** per profile from the environment or a local `.env`, and the **Production guard**.

It is an **independent npm project** (its own `package.json` and `package-lock.json`) and uses
only the public package exports (`@qa-cortex/core/config`, `/logger`, `/secrets`, `/guard`). No
QA Cortex logic is copied here, and nothing depends on the framework folder at run time.

## Layout

```
qa.config.ts              defineQaConfig(): schema extension (site) and profiles local / staging / production
qa.secrets.ts             defineSecrets(): which environment variable holds each secret, per profile
.env.example              placeholder values; copy to .env (gitignored) for local runs
playwright.config.ts      .env loading, loadConfig(), loadSecrets() and the static production guard
tests/
  fixtures.ts             config, logger, secrets and guard fixtures in the project's own test.extend()
  ui/                     browser tests (all visit public websites)
    site.spec.ts            profile-driven smoke test
    logging.spec.ts         logging demo: every level, structured data, redaction
    HandlingBasicFunctionality.spec.ts   UI practice scenarios on vinothqaacademy.com
  failure/                intentional-failure demo; runs only via npm run demo:logging-failure
scripts/                  demo runners and the framework packing helper
vendor/                   packed @qa-cortex/core tarball (not committed; see vendor/README.md)
```

Future test types get their own folders next to `tests/ui/` (for example `tests/api/`).

| File | What it shows |
|---|---|
| `qa.config.ts` | `defineQaConfig()`: a schema extension (`site`) and three profiles: `local`, `staging` and a simulated `production` |
| `qa.secrets.ts` | `defineSecrets()`: a required secret, a per-profile optional one and an optional one |
| `.env.example` | the variables `qa.secrets.ts` reads, with placeholders only; the template for your `.env` |
| `playwright.config.ts` | loads `.env` with Node's `process.loadEnvFile()`; `loadConfig()` and `loadSecrets()` at startup; `baseURL` mapped into `use`; production-safe trace and reporter settings; `assertProductionSafe()` |
| `tests/fixtures.ts` | `configFixtures()`, `loggerFixtures()`, `secretsFixtures()` (after the logger, so every secret is redacted) and `productionGuardFixtures()` composed in the project's own `test` |
| `tests/ui/site.spec.ts` | one browser test whose target and expectations come from the selected profile |
| `tests/ui/logging.spec.ts` | logging demo: every level, structured data, `child()` context, secrets with `get()` and `find()`, redaction (passes) |
| `tests/ui/HandlingBasicFunctionality.spec.ts` | plain Playwright UI scenarios (text box, radio, checkbox, drop-downs, basic auth…) against `vinothqaacademy.com` |
| `tests/failure/logging-failure.spec.ts` | **intentional failure** demo for on-failure log attachments; excluded from every normal run |
| `scripts/with-profile.mjs` | runs `playwright test` with `QA_CORTEX_PROFILE` set (works in any shell) |
| `scripts/invalid-config.mjs` | loads a deliberately broken config and prints the `ConfigError` |
| `scripts/logging-demo.mjs` | runs the logging demo (`success` or `failure`) with a fresh synthetic secret |
| `scripts/production-guard-demo.mjs` | runs the production profile with `--trace on`; the guard blocks it (exit code 1 expected) |
| `scripts/pack-framework.mjs` | inside this repository only: builds `../framework` and writes `vendor/qa-cortex-core.tgz` |

All browser tests here visit public websites, so they are **not** part of the framework's
mandatory CI checks. Run them from this folder.

## Profiles

| Profile | `baseURL` | Page title must contain |
|---|---|---|
| `local` (default) | https://demo.playwright.dev/todomvc/ | `TodoMVC` |
| `staging` | https://playwright.dev/ | `Playwright` |
| `production` (simulated) | https://playwright.dev/ | `Playwright` |

All are public pages run by the Playwright project for demos and examples. The test only
opens the page and reads its URL and title. `production` is a **simulation**: an ordinary
public page marked `production: true`, so the Production guard applies to it.

## Setup (once, inside `automation/`)

`@qa-cortex/core` is not published yet, so this project installs it from a packed tarball at
`vendor/qa-cortex-core.tgz`.

> **Temporary dependency, must be replaced before Release 1.** `package.json` currently has
> `"@qa-cortex/core": "file:vendor/qa-cortex-core.tgz"`. Once `@qa-cortex/core` is published to
> npm, and before Release 1 is tagged:
> 1. Replace that entry with the published version range (for example `"^1.0.0"`).
> 2. Run `npm install` to regenerate `package-lock.json` against the npm registry.
> 3. Delete `vendor/` and `scripts/pack-framework.mjs`, and remove the `framework:pack` script.
> 4. Update this setup section and the root README to use a plain `npm install`.

Inside the qa-cortex repository (builds `../framework` and writes the tarball):

```powershell
cd automation
npm run framework:pack
npm install file:vendor/qa-cortex-core.tgz
Copy-Item .env.example .env
npx playwright install chromium
```

Outside the repository, copy a `@qa-cortex/core` tarball to `vendor/qa-cortex-core.tgz`, then
run the last three commands.

**After re-packing, use `npm install file:vendor/qa-cortex-core.tgz`.** A plain `npm install`
reports "up to date" and keeps the previously installed copy (same version, same `file:` spec),
and `npm ci` fails because the lockfile records the old tarball's checksum. Naming the tarball
re-extracts it and updates the checksum in `package-lock.json`; `package.json` does not change.
Skip the browser install if Chromium for Playwright 1.65.1 is already installed.

### Secrets: `.env`

`qa.secrets.ts` declares the secrets; `.env.example` lists their variables with placeholders.
Copy it to `.env` and replace the placeholders (every demo works with the synthetic
placeholder as it is). `.env` and `.env.*` are gitignored; never commit a real secret, in any
file. In CI, set the variables as real environment variables (repository secrets) instead:
variables already set in the environment win over `.env`.

Without `QA_DEMO_TOKEN`, every run stops at startup with a `SecretsError` that names the
missing variable (never a value).

| Command | What it does |
|---|---|
| `npm test` | Runs every browser test in `tests/ui/` (public websites; `tests/failure/` excluded). |
| `npm run typecheck` | Type-checks configs, tests and scripts against the installed `@qa-cortex/core`. |
| `npm run lint` | ESLint with type-aware rules. |

## Run the demonstrations

From `automation/`.

**1. Local profile (the default)**

```powershell
npm run demo:local
```

**2. Staging profile, selected with `QA_CORTEX_PROFILE`**

```powershell
npm run demo:staging
```

The same test, setting the variable yourself:

```powershell
$env:QA_CORTEX_PROFILE = "staging"; npx playwright test tests/ui/site.spec.ts; Remove-Item Env:QA_CORTEX_PROFILE
```

```bash
QA_CORTEX_PROFILE=staging npx playwright test tests/ui/site.spec.ts
```

**3. Unknown profile: the run stops before any browser starts**

```powershell
npm run demo:unknown-profile
```

This one is meant to fail (exit code 1). npm adds its own "command failed" lines after the
`ConfigError`.

**4. Invalid configuration: a readable `ConfigError`**

```powershell
npm run demo:invalid
```

Exits 0 when the error is raised as expected.

**Type-check the demo** (the same broken config is also rejected at compile time):

```powershell
npm run typecheck
```

## What to look for

- The first line of every run: `[qa-cortex] profile=… baseURL=…`.
- In the test output: `profile=… url=… title="…"`, which differs between `local` and `staging`
  while the test code is identical.
- In the error demos: every problem listed at once, each with the layer that caused it
  (`[base]`, `[profile "local"]`, `[env QA_CORTEX_PROFILE]`), and no config values printed.

## Logging demo (`@qa-cortex/core/logger`)

`tests/fixtures.ts` composes the logger with the config, secrets and guard fixtures:

```ts
export const test = base
  .extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig))
  .extend<LoggerTestFixtures, LoggerWorkerFixtures>(loggerFixtures())
  // After loggerFixtures(): its qaSecrets replaces the logger's empty default.
  .extend<object, SecretsWorkerFixtures<ProjectSecrets>>(secretsFixtures(secretsDef))
  .extend<object, ProductionGuardWorkerFixtures>(productionGuardFixtures());
```

Every secret loaded for the profile is redacted in `qaLog` output. Order matters: if
`loggerFixtures()` came after `secretsFixtures()` (chained, spread or through `mergeTests()`),
the logger's empty default would replace the list. The automatic `qaSecretsCheck` fixture
catches that and fails every worker before any test runs, with a `SecretsError` that names the
secrets (never their values) and says to apply `secretsFixtures()` after `loggerFixtures()`.

Never pass a secret to `expect()`: Playwright records assertion values in traces and reports.

This demo sets `qaLogLevel: 'debug'` (the default is `'info'`) so every level is visible.

**5. Logging demo: passes**

```powershell
npm run demo:logging
```

- **Terminal:** `[debug]`, `[info]`, `[warn]` and `[error]` lines, each with `[profile=local]` context and structured data.
- **Secrets:** the test reads `demoToken` with `get()` (every profile has it) and `basicAuthPassword` with `find()` (optional), and logs which secrets the profile has (names only).
- **Redaction:** the script sets a fresh synthetic `QA_DEMO_TOKEN` for each run (its value is never printed; it wins over `.env`). In the log lines it appears only as `[REDACTED]`, as does the value under the `password` key; the `Secret` object itself is logged as `{"name":"demoToken"}`. Its value always has the form `demo-synthetic-` followed by 12 hex digits; searching the terminal or report for that pattern (regex `demo-synthetic-[0-9a-f]{12}`) should find nothing.
- **Attachment:** this project uses `qaLogAttach: 'always'`, so the passing test still gets a `qa-cortex-log.jsonl` attachment.
- **Expected exit code:** 0.

**6. Intentional failure demo: exit code 1 is expected**

```powershell
npm run demo:logging-failure
```

- **Why it fails:** one test asserts a page title that doesn't exist. **This failure is on purpose.**
- **Isolation:** the failing spec lives in `tests/failure/` and runs **only** through this script, which sets `QAC_DEMO_FAILURE=1`. `npm test` and every other demo ignore that folder.
- **Attachments:** this project uses `qaLogAttach: 'on-failure'`, the logger default. The passing test gets **no** attachment; the failing test keeps its `qa-cortex-log.jsonl` for diagnosis.
- **Exit code:** 1. The script prints `> failure demo finished with exit code 1, as expected.`, and npm then adds its own "command failed" lines.

**7. Open the HTML report**

```powershell
npm run report
```

This is Playwright's own HTML report, from the most recent run. For each test, look at:

- **stdout / stderr:** the readable log lines (debug/info on stdout, warn/error on stderr)
- **Attachments → `qa-cortex-log.jsonl`:** one JSON record per line, with `time`, `level`, `msg`, `context`, `data` and the test metadata (`title`, `project`, `worker`, `retry`, `testId`)
- **Failed test** (after the failure demo): the error, the screenshot and trace from Playwright, plus the log attachment

`npm run report` starts a local web server; stop it with Ctrl+C.

## Production guard demo (`@qa-cortex/core/guard`)

The `production` profile is marked `production: true`. `playwright.config.ts` then turns tracing
off and drops the HTML report, and `assertProductionSafe()` checks that every project agrees.
The `qaProductionGuard` fixture checks again at run time, where command-line flags and
`test.use()` are visible.

**8. Safe production run: passes**

```powershell
npm run demo:production
```

- **Terminal:** `[qa-cortex] profile=production … production=true`, then `1 passed`.
- **Artifacts:** no trace, video or screenshot; no HTML report for this run.

**9. Unsafe production run: blocked, exit code 1 is expected**

```powershell
npm run demo:production-guard
```

- **What it does:** runs the production profile with `--trace on` on the command line. The
  static check cannot see command-line flags, so the run starts; the guard fixture then fails
  the worker **before a browser launches**.
- **Terminal:** `ProductionGuardError: QA Cortex production guard: …` and
  `project "chromium": trace is "on"; production requires "off"`, then
  `> production guard demo finished with exit code 1, as expected.`
- **Known limit:** because tracing was requested, Playwright still writes a test-runner
  `trace.zip` for the blocked test, holding only hook names, the error and test source (no
  browser data). See ADR 0008 for this and the guard's other limits.

### What redaction does not cover

Redaction applies only to what `qaLog` writes. Playwright's own artifacts are not redacted:

- traces
- screenshots and videos
- network logs
- action parameters
- assertion and failure messages

That's why the failing test keeps the secret out of its assertion, and why secrets come from
the environment instead of literals in source: traces and the HTML report embed source code.
A `Secret` object prints as `[REDACTED]`, but once you call `reveal()` the value is an ordinary
string, and whatever receives it (for example `fill()`) can be recorded. See the main README,
ADR 0007 (`framework/docs/adr/0007-logging.md`) and ADR 0008
(`framework/docs/adr/0008-secrets-and-production-guard.md`).
