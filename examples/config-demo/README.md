# Config and logging demo: `@qa-cortex/core`

A small Playwright project showing what QA Cortex provides today: one typed configuration
with environment **profiles**, switched with **`QA_CORTEX_PROFILE`**, validated before any
test runs, a readable **`ConfigError`** when something is wrong, and **structured, redacting
logging** (`qaLog`) visible in the terminal and in Playwright's HTML report.

It uses the real package exports (`@qa-cortex/core/config`, `@qa-cortex/core/logger`) through
the npm workspace. No QA Cortex logic is copied here.

| File | What it shows |
|---|---|
| `qa.config.ts` | `defineQaConfig()`: a schema extension (`site`) and two profiles, `local` and `staging` |
| `playwright.config.ts` | `loadConfig()` at the top of Playwright's own config; `baseURL` mapped into `use`; log level and attachment policy; list + HTML reporters |
| `tests/fixtures.ts` | `configFixtures()` and `loggerFixtures()` composed in the project's own `test.extend()`; `qaSecrets` override with a synthetic secret |
| `tests/logging.spec.ts` | logging demo: every level, structured data, `child()` context, redaction (passes) |
| `tests/failure/logging-failure.spec.ts` | **intentional failure** demo for on-failure log attachments; excluded from every normal run |
| `tests/site.spec.ts` | one browser test whose target and expectations come from the selected profile |
| `scripts/with-profile.mjs` | runs `playwright test` with `QA_CORTEX_PROFILE` set (works in any shell) |
| `scripts/invalid-config.mjs` | loads a deliberately broken config and prints the `ConfigError` |
| `scripts/logging-demo.mjs` | runs the logging demo (`success` or `failure`) with a fresh synthetic secret |

## Profiles

| Profile | `baseURL` | Page title must contain |
|---|---|---|
| `local` (default) | https://demo.playwright.dev/todomvc/ | `TodoMVC` |
| `staging` | https://playwright.dev/ | `Playwright` |

Both are public pages run by the Playwright project for demos and examples. The test only
opens the page and reads its URL and title.

## Setup (once, from the repository root)

```powershell
npm install
npm run build
npx playwright install chromium
```

`npm run build` compiles `@qa-cortex/core`; the demo imports its built output.
Skip the last command if Chromium for Playwright 1.65.1 is already installed.

## Run the demonstrations

From `examples/config-demo`:

```powershell
cd examples/config-demo
```

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
$env:QA_CORTEX_PROFILE = "staging"; npx playwright test; Remove-Item Env:QA_CORTEX_PROFILE
```

```bash
QA_CORTEX_PROFILE=staging npx playwright test
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

That's why the failing test keeps the secret out of its assertion, and why the secret is never written as a literal in test source: traces and the HTML report embed source code. See the main README and ADR 0007.
