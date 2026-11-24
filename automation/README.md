# QA Cortex automation project

A ready-to-use Playwright automation project built on `@qa-cortex/core`: one typed
configuration with environment **profiles**, switched with **`QA_CORTEX_PROFILE`**, validated
before any test runs, a readable **`ConfigError`** when something is wrong, and **structured,
redacting logging** (`qaLog`) visible in the terminal and in Playwright's HTML report.

It is an **independent npm project** (its own `package.json` and `package-lock.json`) and uses
only the public package exports (`@qa-cortex/core/config`, `@qa-cortex/core/logger`). No
QA Cortex logic is copied here, and nothing depends on the framework folder at run time.

## Layout

```
qa.config.ts              defineQaConfig(): schema extension (site) and profiles local / staging
playwright.config.ts      loadConfig() at the top of Playwright's own config; baseURL mapped into use
tests/
  fixtures.ts             configFixtures() + loggerFixtures() in the project's own test.extend()
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
| `qa.config.ts` | `defineQaConfig()`: a schema extension (`site`) and two profiles, `local` and `staging` |
| `playwright.config.ts` | `loadConfig()` at the top of Playwright's own config; `baseURL` mapped into `use`; log level and attachment policy; list + HTML reporters |
| `tests/fixtures.ts` | `configFixtures()` and `loggerFixtures()` composed in the project's own `test.extend()`; `qaSecrets` override with a synthetic secret |
| `tests/ui/site.spec.ts` | one browser test whose target and expectations come from the selected profile |
| `tests/ui/logging.spec.ts` | logging demo: every level, structured data, `child()` context, redaction (passes) |
| `tests/ui/HandlingBasicFunctionality.spec.ts` | plain Playwright UI scenarios (text box, radio, checkbox, drop-downs, basic auth…) against `vinothqaacademy.com` |
| `tests/failure/logging-failure.spec.ts` | **intentional failure** demo for on-failure log attachments; excluded from every normal run |
| `scripts/with-profile.mjs` | runs `playwright test` with `QA_CORTEX_PROFILE` set (works in any shell) |
| `scripts/invalid-config.mjs` | loads a deliberately broken config and prints the `ConfigError` |
| `scripts/logging-demo.mjs` | runs the logging demo (`success` or `failure`) with a fresh synthetic secret |
| `scripts/pack-framework.mjs` | inside this repository only: builds `../framework` and writes `vendor/qa-cortex-core.tgz` |

All browser tests here visit public websites, so they are **not** part of the framework's
mandatory CI checks. Run them from this folder.

## Profiles

| Profile | `baseURL` | Page title must contain |
|---|---|---|
| `local` (default) | https://demo.playwright.dev/todomvc/ | `TodoMVC` |
| `staging` | https://playwright.dev/ | `Playwright` |

Both are public pages run by the Playwright project for demos and examples. The test only
opens the page and reads its URL and title.

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
npm install
npx playwright install chromium
```

Outside the repository, copy a `@qa-cortex/core` tarball to `vendor/qa-cortex-core.tgz`, then
run `npm install` and `npx playwright install chromium`.

`npm install` (not `npm ci`) is the right command after re-packing: the lockfile records the
tarball's checksum, so it changes whenever the framework's packaged contents change.
Skip the browser install if Chromium for Playwright 1.65.1 is already installed.

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

`tests/fixtures.ts` composes the logger with the config fixtures:

```ts
const withConfig = base.extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig));
export const test = withConfig.extend<LoggerTestFixtures, LoggerWorkerFixtures>({
  ...loggerFixtures(),
  qaSecrets: [async ({}, use) => use([DEMO_SECRET]), { scope: 'worker' }], // synthetic secret
});
```

This demo sets `qaLogLevel: 'debug'` (the default is `'info'`) so every level is visible.

**5. Logging demo: passes**

```powershell
npm run demo:logging
```

- **Terminal:** `[debug]`, `[info]`, `[warn]` and `[error]` lines, each with `[profile=local]` context and structured data.
- **Redaction:** a fresh synthetic secret is generated for each run (its value is never printed). In the log lines it appears only as `[REDACTED]`, as does the value under the `password` key. Its value always has the form `demo-synthetic-` followed by 12 hex digits; searching the terminal or report for that pattern (regex `demo-synthetic-[0-9a-f]{12}`) should find nothing. The bare prefix can still show up in a trace, inside its copy of the `tests/fixtures.ts` source, which is code, not the secret.
- **Attachment:** this project uses `qaLogAttach: 'always'`, so the passing test still gets a `qa-cortex-log.jsonl` attachment.
- **Expected exit code:** 0.

**6. Intentional failure demo: exit code 1 is expected**

```powershell
npm run demo:logging-failure
```

- **Why it fails:** one test asserts a page title that doesn't exist. **This failure is on purpose.**
- **Isolation:** the failing spec lives in `tests/failure/` and runs **only** through this script, which sets `QAC_DEMO_FAILURE=1`. `npm test`, `demo:local`, `demo:staging` and `demo:logging` all ignore that folder.
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

### What redaction does not cover

Redaction applies only to what `qaLog` writes. Playwright's own artifacts are not redacted:

- traces
- screenshots and videos
- network logs
- action parameters
- assertion and failure messages

That's why the failing test keeps the secret out of its assertion, and why the secret is never written as a literal in test source: traces and the HTML report embed source code. See the main README and ADR 0007 (`framework/docs/adr/0007-logging.md`).
