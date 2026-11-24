# QA Cortex automation project

A ready-to-use Playwright automation project built on `@qa-cortex/core`: one typed
configuration with environment **profiles**, switched with **`QA_CORTEX_PROFILE`**, validated
before any test runs, a readable **`ConfigError`** when something is wrong, **structured,
redacting logging** (`qaLog`) visible in the terminal and in Playwright's HTML report, **typed
secrets** per profile from the environment or a local `.env`, the **Production guard**, and
**reporter and artifact presets** for local, CI and production runs.

It is also a **starter project**: page objects, a reusable UI component, JSON test data,
data-driven tests and page object fixtures, with sample tests for the
[QA Cortex Test Automation Lab](https://qacortex.com/lab-app/). Copy the pattern, replace the
lab with your application, and start writing tests (see [Writing tests](#writing-tests)).

It is an **independent npm project** (its own `package.json` and `package-lock.json`) and uses
only the public package exports (`@qa-cortex/core/config`, `/logger`, `/secrets`, `/guard`,
`/presets`). No
QA Cortex logic is copied here, and nothing depends on the framework folder at run time.

## Layout

```
qa.config.ts              defineQaConfig(): schema extension (site) and profiles local / staging / production
qa.secrets.ts             defineSecrets(): which environment variable holds each secret, per profile
.env.example              placeholder values; copy to .env (gitignored) for local runs
playwright.config.ts      .env loading, loadConfig(), loadSecrets(), the preset and the static production guard
pages/                    page objects, one per lab scenario (plain classes, no base class)
components/               UI parts shared by several pages (the lab's Scenarios menu)
data/                     JSON test data (non-sensitive values only)
tests/
  fixtures.ts             config, logger, secrets, guard and page object fixtures in the project's own test
  ui/                     browser tests (all visit public websites)
    navigation.spec.ts      lab menu (component), one test per scenario in data/scenarios.json
    text-box.spec.ts        page object fixture, data-driven names, read-only vs disabled fields
    check-box.spec.ts       default states, single selection, Select All / Deselect All
    dropdown.spec.ts        select by label (one test per city), value and index; multiple select
    text-validation.spec.ts negative and positive paths of a form; dynamic text
    site.spec.ts            profile-driven smoke test
    logging.spec.ts         logging demo: every level, structured data, redaction
  failure/                intentional-failure demo; runs only via npm run demo:logging-failure
scripts/                  demo runners and the framework packing helper
vendor/                   packed @qa-cortex/core tarball (not committed; see vendor/README.md)
reference/                optional local reference scripts: gitignored, never linted, type-checked or run
playwright-report/, reports/, allure-results/, allure-report/, test-results/   generated reports (gitignored; see Reports)
../.github/workflows/automation.yml   manual GitHub Actions run of these tests (see GitHub Actions)
```

Future test types get their own folders next to `tests/ui/` (for example `tests/api/`).

| File | What it shows |
|---|---|
| `qa.config.ts` | `defineQaConfig()`: a schema extension (`site`) and three profiles: `local`, `staging` and a simulated `production` |
| `qa.secrets.ts` | `defineSecrets()`: a required secret, a per-profile optional one and an optional one |
| `.env.example` | the variables `qa.secrets.ts` reads, with placeholders only; the template for your `.env` |
| `playwright.config.ts` | loads `.env` with Node's `process.loadEnvFile()`; `loadConfig()` and `loadSecrets()` at startup; `qaPreset(selectPreset(...))` for reporters and trace/video/screenshot; `baseURL` mapped into `use`; `assertProductionSafe()` |
| `tests/fixtures.ts` | `configFixtures()`, `loggerFixtures()`, `secretsFixtures()` (after the logger, so every secret is redacted) and `productionGuardFixtures()` composed in the project's own `test` |
| `tests/ui/site.spec.ts` | one browser test whose target and expectations come from the selected profile |
| `tests/ui/logging.spec.ts` | logging demo: every level, structured data, `child()` context, secrets with `get()` and `find()`, redaction (passes) |
| `tests/failure/logging-failure.spec.ts` | **intentional failure** demo for on-failure log attachments; excluded from every normal run |
| `scripts/with-profile.mjs` | runs `playwright test` with `QA_CORTEX_PROFILE` set (works in any shell) |
| `scripts/invalid-config.mjs` | loads a deliberately broken config and prints the `ConfigError` |
| `scripts/logging-demo.mjs` | runs the logging demo (`success` or `failure`) with a fresh synthetic secret |
| `scripts/ci-preset-demo.mjs` | runs the smoke and logging tests with `QA_CORTEX_PRESET=ci` and lists the report files written |
| `scripts/production-guard-demo.mjs` | runs the production profile with `--trace on`; the guard blocks it (exit code 1 expected) |
| `scripts/pack-framework.mjs` | inside this repository only: builds `../framework` and writes `vendor/qa-cortex-core.tgz` |

All browser tests here visit public websites, so they are **not** part of the framework's
mandatory CI checks. Run them from this folder.

## Profiles

| Profile | `baseURL` | Page title must contain |
|---|---|---|
| `local` (default) | https://qacortex.com/lab-app/ | `QA Cortex` |
| `staging` (simulated) | https://qacortex.com/lab-app/ | `QA Cortex` |
| `production` (simulated) | https://qacortex.com/lab-app/ | `QA Cortex` |

The application under test is the public **QA Cortex Test Automation Lab**, which has a single
host, so every profile points at it and only the labels differ. In your own project, give each
profile its environment's host (`baseURL: 'https://staging.example.com/'`). Page objects use
paths relative to `baseURL`, so tests never change between environments. `production` is a
**simulation**: the same practice application marked `production: true`, so the Production
guard applies to it.

## Setup (once, inside `automation/`)

**Prerequisites:** Node.js **22.18 or later** (`package.json` `engines`; the Allure 3 report
generator needs it, while `@qa-cortex/core` itself supports 22.12+) and npm. No Java is needed.

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
npx playwright install chromium firefox webkit
```

Outside the repository, copy a `@qa-cortex/core` tarball to `vendor/qa-cortex-core.tgz`, then
run the last three commands.

**After re-packing, use `npm install file:vendor/qa-cortex-core.tgz`.** A plain `npm install`
reports "up to date" and keeps the previously installed copy (same version, same `file:` spec),
and `npm ci` fails because the lockfile records the old tarball's checksum. Naming the tarball
re-extracts it and updates the checksum in `package-lock.json`; `package.json` does not change.
Skip the browser install if the browsers for Playwright 1.65.1 are already installed. Install
only `chromium` if you run Chromium alone (the default of `npm test`).

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
| `npm test` | Runs every test in `tests/ui/` in Chromium (public websites; `tests/failure/` excluded). More in [Running tests](#running-tests). |
| `npm run typecheck` | Type-checks configs, tests and scripts against the installed `@qa-cortex/core`. |
| `npm run lint` | ESLint with type-aware rules. |

## Writing tests

The sample tests automate a few scenarios of the
[QA Cortex Test Automation Lab](https://qacortex.com/lab-app/). Everything below is plain
Playwright; QA Cortex only adds configuration, secrets, logging and safety checks.

| Piece | Where | Rule |
|---|---|---|
| Page object | `pages/<name>.page.ts` | One class per page: typed `Locator` fields, an `open()` using a path relative to `baseURL`, and actions named after what the user does (`submitAccountNumber()`). **No assertions, no base class.** |
| Component | `components/<name>.ts` | A part several pages share (the lab's Scenarios menu). Pages **hold** one (`readonly menu = new ScenarioMenu(page)`) instead of inheriting it. |
| Test data | `data/<name>.json` | Non-sensitive values only. Import with `import data from '../../data/x.json' with { type: 'json' }`: typed, no loader needed. Credentials belong in `qa.secrets.ts` and `.env`. |
| Data-driven test | the spec | A loop that declares one test per record (`for (const city of data.cities) test(...)`): each record is a separate test in the report and can run in parallel. |
| Page object fixture | `tests/fixtures.ts` | Add one line per page object: `myPage: ({ page }, use) => use(new MyPage(page))`. Tests then ask for `myPage`. |
| Expectations | the spec | Web-first assertions (`await expect(locator).toHaveText(...)`) in the test, so the business flow reads top to bottom. No fixed waits (`waitForTimeout`): assertions wait by themselves. |
| Logging | the spec | `qaLog.info('transfer completed', { ... })`: structured, redacted, attached to the report. |

A new page in four steps:

1. Create `pages/orders.page.ts`:

   ```ts
   import type { Locator, Page } from '@playwright/test';

   export class OrdersPage {
     static readonly path = '#/orders';
     readonly heading: Locator;
     readonly search: Locator;

     constructor(readonly page: Page) {
       this.heading = page.getByRole('heading', { level: 1, name: 'Orders' });
       this.search = page.getByRole('searchbox', { name: 'Search orders' });
     }

     async open(): Promise<void> {
       await this.page.goto(OrdersPage.path);
     }
   }
   ```

2. Register it in `tests/fixtures.ts` (`PageFixtures` type and `.extend<PageFixtures>({ ... })`).
3. Put its test data in `data/orders.json`.
4. Write `tests/ui/orders.spec.ts`, importing `test` and `expect` from `../fixtures.js`:

   ```ts
   test('finds an order', async ({ ordersPage }) => {
     await ordersPage.open();
     await ordersPage.search.fill('A-1001');
     await expect(ordersPage.page.getByRole('row', { name: /A-1001/ })).toBeVisible();
   });
   ```

Tag a test (or a whole `describe`) with Playwright's native tags: `test('…', { tag: '@smoke' }, …)`.
Tags add up, so a `@regression` describe can hold a test that is also `@smoke`.

Not added on purpose, because Playwright already provides them: wrappers around `click`/`fill`,
custom waits, retry helpers, a custom tagging or parallel mechanism and a base page class.
Allure and a CI workflow are planned for the next steps.

## Running tests

Everything here is Playwright's own command line; the npm scripts are shortcuts. Every run uses
the selected environment profile (`QA_CORTEX_PROFILE`, default `local`), the project fixtures
and the reporter preset.

| Command | What it runs |
|---|---|
| `npm test` | every test, **Chromium**, headless |
| `npm run test:chromium` / `test:firefox` / `test:webkit` | every test in one browser |
| `npm run test:all` | every test in **Chromium, Firefox and WebKit** |
| `npm run test:smoke` | tests tagged `@smoke` (quick health check), Chromium |
| `npm run test:regression` | tests tagged `@regression` (full feature coverage), Chromium |
| `npm run test:headed` | Chromium with a visible browser window |
| `npm run test:ui` | Playwright UI mode: pick projects, tests and tags; watch, time-travel through steps |
| `npm run test:debug` | Playwright Inspector: step through each action (use with one test, see below) |
| `npm run report` | opens the last HTML report |

Add Playwright options after `--` (npm passes them on):

```powershell
npm test -- tests/ui/text-box.spec.ts                 # one file
npm test -- tests/ui/dropdown.spec.ts:14              # one test, by line
npm test -- -g "Cardiff"                              # by test name (regular expression)
npm run test:smoke -- --workers=4                     # more workers
npm test -- --retries=1 --timeout=60000               # retries and per-test timeout
npm run test:debug -- -g "transfer completes"         # debug one test
npm run test:headed -- tests/ui/check-box.spec.ts     # watch one file run
```

Browsers and tags combine with plain Playwright commands (`--project` may be repeated):

```powershell
npx playwright test --project=firefox --grep @smoke
npx playwright test --project=chromium --project=webkit --grep @regression
npx playwright test --grep-invert @regression         # everything except @regression
```

Combine with an environment profile:

```powershell
$env:QA_CORTEX_PROFILE = "staging"; npm run test:smoke; Remove-Item Env:QA_CORTEX_PROFILE
node scripts/with-profile.mjs staging --project=firefox --grep @smoke
```

```bash
QA_CORTEX_PROFILE=staging npm run test:smoke
```

**Defaults** (`playwright.config.ts`; native Playwright options):

| Setting | Local | CI (`CI` set) | Override |
|---|---|---|---|
| Browser | Chromium (`npm test`) | Chromium | `--project=firefox` (repeatable), or `npm run test:all` |
| Headless | yes | yes | `--headed` |
| Parallel | yes: `fullyParallel`, so tests in one file also run in parallel | yes | `--workers=1` runs one at a time |
| Workers | Playwright's default: half the CPU cores | **2** (conservative for shared runners) | `--workers=4` or `--workers=50%` |
| Retries | 0 | 2 | `--retries=N` |
| Test timeout | 30 s (test, its hooks and fixtures) | 30 s | `--timeout=60000`; or `test.slow()` / `test.setTimeout()` in a test |
| Assertion timeout | 5 s per web-first assertion | 5 s | no CLI flag: `expect(locator).toBeVisible({ timeout: 10_000 })`, or `expect.timeout` in the config |

The sample tests are parallel-safe: every test gets its own browser context and page, opens its
page itself, and keeps no state between tests. Keep new tests that way. A test that retries and
then passes is reported as **flaky**, not as passed.

## Reports

Every run writes these (all gitignored). Which ones depends on the reporter preset (see
[Reporter and artifact presets](#reporter-and-artifact-presets-qa-cortexcorepresets)):

| Report | Where | Presets | Open it |
|---|---|---|---|
| Terminal | console: `list` locally, `dot` in CI (`github` annotations on GitHub Actions) | all | — |
| Playwright HTML report | `playwright-report/index.html`, with screenshots, videos, traces and the `qa-cortex-log.jsonl` log of each test | local, ci | `npm run report` |
| JUnit XML | `reports/junit.xml`, for CI systems and test management tools | ci, production | any JUnit viewer |
| Allure results | `allure-results/` (raw; cleared at the start of every run) | local, ci | — |
| Allure report | `allure-report/`, generated from the results | local, ci | `npm run allure:generate`, then `npm run allure:open` |
| Raw diagnostics | `test-results/<test>/`: trace.zip, video.webm, screenshots, error-context.md | local, ci (on failure) | `npx playwright show-trace <trace.zip>` |

Allure report in two commands:

```powershell
npm run test:smoke             # any run writes allure-results/
npm run allure:generate        # writes allure-report/ (replaces the previous one)
npm run allure:open            # serves it on http://127.0.0.1:<port> and opens the browser
```

The report generator is the `allure` package (Allure 3, a dev dependency): it needs **no Java**,
but needs Node.js 22.18 or later. `allure:open` serves on 127.0.0.1 only; stop it with Ctrl+C.

A failed test shows, in both the HTML and the Allure report: the error, the screenshot, the
trace and (locally) the video, and the QA Cortex log `qa-cortex-log.jsonl`, whose secrets are
written as `[REDACTED]`. **Reports are not redacted as a whole:** Playwright's own steps,
traces and screenshots show what a test typed and saw, so never type a real secret into a page
in a test whose report you share (see [What redaction does not cover](#what-redaction-does-not-cover)).
The CI preset records no video; to change that, pass `{ artifacts: { video: 'retain-on-failure' } }`
to `qaPreset()` in `playwright.config.ts`.

## GitHub Actions

`.github/workflows/automation.yml` runs these tests on GitHub. It is **manual only**: the sample
tests visit a public website, so they never run on pull requests and never block the
framework's own checks (`ci.yml`, `compatibility.yml`).

**One-time setup** (repository **Settings → Secrets and variables → Actions → New repository
secret**):

| Secret | Required | Used by |
|---|---|---|
| `QA_DEMO_TOKEN` | **yes** (every profile) | the logging demo; any synthetic value of 4+ characters works |
| `QA_STAGING_API_TOKEN` | no | the `staging` profile (`qa.secrets.ts`) |
| `QA_PRODUCTION_API_TOKEN` | no | the `production` profile |
| `QA_BASIC_AUTH_PASSWORD` | no | any profile |

These are the variables `qa.secrets.ts` reads; add a secret here, and a line under the
`Run tests` step's `env:` in the workflow, when you add one there. Secrets are given to the
test step only (not to install steps). GitHub masks their values in the log, and QA Cortex
redacts them in its own log output. No `.env` file is used or uploaded in CI.

**Run it:** **Actions → Automation tests → Run workflow**, then choose:

| Input | Choices | Becomes |
|---|---|---|
| Browser | chromium (default), firefox, webkit, all | `--project=<browser>` (none for all) |
| Environment profile | local (default), staging, production | `QA_CORTEX_PROFILE` |
| Tests | smoke (default), regression, all | `--grep @smoke` / `--grep @regression` (none for all) |

The run uses the CI settings from `playwright.config.ts` (`CI` is set on GitHub): 2 workers,
2 retries, the `ci` preset, or `production` with its guard for the production profile.

Steps: build `@qa-cortex/core` from `framework/` and install the tarball, install the chosen
browsers, type-check, lint, run the tests, generate the Allure report, upload the reports.
**A failing test fails the run**, and the reports are uploaded anyway.

**Download reports:** open the run, scroll to **Artifacts** (kept **14 days**):

| Artifact | Contents |
|---|---|
| `playwright-report-<tests>-<browser>-<profile>` | the HTML report with screenshots, traces and logs; unzip, then `npx playwright show-report <folder>` |
| `junit-…` | `junit.xml` |
| `allure-results-…` | raw Allure results (to merge or regenerate) |
| `allure-report-…` | the generated Allure report; unzip, then `npx allure open <folder>` |
| `test-results-…-production` | production profile, failed runs only: error context (artifacts are off in production) |

**Troubleshooting a failed run:**

| Symptom | Cause and fix |
|---|---|
| `SecretsError: … QA_DEMO_TOKEN` | the repository secret is missing; add it (see above) |
| `ConfigError` | the profile or `qa.config.ts` is invalid; the message names the field and the layer |
| `ProductionGuardError` | a production run would record traces, videos or screenshots; keep the production preset's settings |
| Tests fail on one browser only | open that browser's HTML report and trace; compare with a local `npm run test:<browser>` |
| Many tests time out | the lab (or your application) may be down or slow; check it in a browser before changing timeouts |
| Passed after a retry (**flaky**) | listed as flaky in both reports; fix the test, do not raise retries |
| Install step fails | `npm ci` in `framework/` needs `framework/package-lock.json` to match its `package.json` |

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
- In the test output: `profile=… url=… title="…"`, and in the HTML report the `environment`
  annotation with the profile's label, which differs between `local` and `staging` while the
  test code is identical.
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

The `production` profile is marked `production: true`. `selectPreset()` then always picks the
`production` preset (no trace, video, screenshot or HTML report), and `assertProductionSafe()`
checks that every project agrees.
The `qaProductionGuard` fixture checks again at run time, where command-line flags and
`test.use()` are visible.

**8. Safe production run: passes**

```powershell
npm run demo:production
```

- **Terminal:** `[qa-cortex] profile=production … production=true preset=production`, then `1 passed`.
- **Files:** `reports/junit.xml` only (plus Playwright's own `test-results/.last-run.json`): no
  trace, video, screenshot or HTML report.

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

The same applies to **every report that stores them**: the Playwright HTML report, the Allure
results and report (`allure-results/`, `allure-report/`), the JUnit file (failure messages), and
the GitHub Actions artifacts made from them. Allure copies Playwright's steps, screenshots,
videos, traces and attachments into its own files. Only the `qa-cortex-log.jsonl` attachment is
redacted. Treat reports and CI artifacts as sensitive when tests handle real credentials or
data, and keep them private. GitHub masks secrets in the workflow **log** only, not inside
uploaded artifacts. In production profiles, the production preset turns traces, videos,
screenshots, the HTML report and Allure off.

That's why the failing test keeps the secret out of its assertion, and why secrets come from
the environment instead of literals in source: traces and the HTML report embed source code.
A `Secret` object prints as `[REDACTED]`, but once you call `reveal()` the value is an ordinary
string, and whatever receives it (for example `fill()`) can be recorded. See the main README,
ADR 0007 (`framework/docs/adr/0007-logging.md`) and ADR 0008
(`framework/docs/adr/0008-secrets-and-production-guard.md`).

## Reporter and artifact presets (`@qa-cortex/core/presets`)

`playwright.config.ts` takes its reporters and its `trace`/`video`/`screenshot` settings from a
preset. The first line of every run shows which one: `[qa-cortex] … preset=local`.

| Preset | Chosen when | Artifacts | Reporters and files |
|---|---|---|---|
| `local` | default | trace, video and screenshot of failed tests | list; HTML report in `playwright-report/` (`npm run report`); Allure results (added by this project) |
| `ci` | `CI` is set | trace and screenshot of failed tests; no video | dot (github on GitHub Actions); HTML report; `reports/junit.xml`; Allure results (added by this project) |
| `production` | the profile is `production` (always) | none | list; `reports/junit.xml` |

`QA_CORTEX_PRESET=local|ci|production` chooses a preset by hand, except that a production
profile always uses `production` (anything else stops the run with a `PresetError`).

**10. CI preset on your machine**

```powershell
npm run demo:ci
```

- **Terminal:** `[qa-cortex] … preset=ci`, dot output, then `> reports/junit.xml: written` and
  `> playwright-report/index.html: written`.
- `reports/` is gitignored, like `playwright-report/` and `test-results/`.

### Changing a preset

Everything is overridable in `playwright.config.ts`; the result is plain Playwright config.

```ts
const preset = qaPreset(selectPreset({ production: qa.production }), {
  artifacts: { video: 'off' },                         // single settings
  reporters: {
    junit: { outputFile: 'reports/e2e-junit.xml' },     // options merged over the preset's
    html: false,                                        // drop a reporter
    json: true,                                         // add reports/results.json
    extra: [['./my-reporter.ts']],                      // add any reporter, in order
  },
});
// or the whole list yourself (not combinable with html/junit/json/extra):
qaPreset('ci', { reporters: { replace: [['line'], ['junit', { outputFile: 'reports/junit.xml' }]] } });
```

`qaPreset()` stops with a `PresetError` when a report file would land inside `outputDir` (pass
`outputDir` if you changed it) or the HTML report folder, or two reporters write the same file.
Command-line flags (`--reporter`, `--trace`) still override the config, as in any Playwright
project; in production the guard still checks them.

### Allure in this project

Allure is added in `playwright.config.ts` through the preset's `reporters.extra`, so the preset's
own reporters stay as they are. It is on in the `local` and `ci` presets and **off in
`production`**, where every reporter other than the console, JUnit and JSON ones must be
approved, because Allure keeps test steps and attachments:
`extra: [{ reporter: ['allure-playwright', { resultsDir: 'allure-results' }], allowInProduction: true }]`.
See [Reports](#reports) for the commands.

### What presets do not guarantee

Turning artifacts off reduces what is recorded; it is not complete protection. Secrets can still
reach console output, error and assertion messages, JUnit and JSON results (they carry test
output and errors), attachments added by tests, and whatever a third-party reporter collects.
See ADR 0009 (`framework/docs/adr/0009-reporter-artifact-presets.md`).
