# Config demo: `@qa-cortex/core/config`

A small Playwright project showing what QA Cortex provides today: one typed configuration
with environment **profiles**, switched with **`QA_CORTEX_PROFILE`**, validated before any
test runs, and a readable **`ConfigError`** when something is wrong.

It uses the real package exports (`@qa-cortex/core/config`) through the npm workspace.
No configuration logic is copied here.

| File | What it shows |
|---|---|
| `qa.config.ts` | `defineQaConfig()`: a schema extension (`site`) and two profiles, `local` and `staging` |
| `playwright.config.ts` | `loadConfig()` at the top of Playwright's own config; `baseURL` mapped into `use` |
| `tests/fixtures.ts` | `configFixtures()` added to the project's own `test.extend()`: a `qaConfig` fixture, loaded once per worker |
| `tests/site.spec.ts` | one browser test whose target and expectations come from the selected profile |
| `scripts/with-profile.mjs` | runs `playwright test` with `QA_CORTEX_PROFILE` set (works in any shell) |
| `scripts/invalid-config.mjs` | loads a deliberately broken config and prints the `ConfigError` |

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
