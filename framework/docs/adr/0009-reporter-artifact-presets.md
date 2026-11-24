# ADR 0009 — Reporter and artifact presets (`@qa-cortex/core/presets`)

- Status: accepted (Step 9C design and implementation, 2026-11-24). Phase 1 module 6 ("Reporter and artifact presets"). Implements the preset table of ADR 0003, with the change to local tracing below; works with the Production guard of ADR 0008.
- Code: `packages/core/src/presets/`
- Tests:
  - unit tests: `packages/core/test/presets/presets.spec.ts`
  - with the guard: `packages/core/test/presets/guard.spec.ts`
  - under the runner: `packages/core/test/presets/fixtures.spec.ts` (nested project `test/fixtures/pw-presets/`, copied to a temporary folder so default paths are used as shipped)
  - type tests: `packages/core/test/types/presets.types.ts`
  - packed-package consumers: `compat/consumer/` (probes; `playwright.config.ts` uses `qaPreset`)
- Versions verified: `@playwright/test` 1.65.1 (runtime, nested runs); consumer type-check and Chromium run on 1.60.0 and 1.65.1 (Windows, Node 26.13.1, locally). Every option and reporter used (`trace`/`video`/`screenshot` modes, `list`, `dot`, `github`, `html`, `junit`, `json`, `blob`, `ReporterDescription`, `HtmlReporterOptions`, `JUnitReporterOptions`, `JsonReporterOptions`) exists in 1.60.

## Context
Every project writes the same artifact and reporter decisions into `playwright.config.ts`, usually as `CI ? … : …` conditions. ADR 0003 decided the values; ADR 0008 checks production runs. Playwright already provides every reporter and artifact; CLAUDE.md rules out a custom runner, reporter UI or wrapper.

## Decision
A new, independent subpath `./presets` that returns plain Playwright values. It implements no reporter, post-processes nothing and imports no other QA Cortex module; `production` is a plain boolean passed in.

### API
- `selectPreset({ production, ci?, env? })` → `'local' | 'ci' | 'production'`: production profile → `production`; else `QA_CORTEX_PRESET` if set; else `ci` when `CI` is set (Playwright's own convention, `!!process.env.CI`); else `local`. In a production profile, `QA_CORTEX_PRESET` may only say `production`, otherwise `PresetError`.
- `qaPreset(name, options?)` → a frozen `{ name, reporter, use }` with a **fresh** reporter array every call. `reporter` goes to `defineConfig({ reporter })`; `use` (`trace`, `video`, `screenshot`) is spread into the user's own `use`.
- `artifactPresets` (frozen), `PRESET_ENV_VAR`, `PRESET_NAMES`, `PresetError` (every problem listed at once).
- Dropped from the design as redundant: a separate `reporterPresets()`; `qaPreset(...).reporter` is the same list.

### Presets
| Preset | `trace` | `video` | `screenshot` | Reporters |
|---|---|---|---|---|
| `local` | `retain-on-failure` | `retain-on-failure` | `only-on-failure` | `list`, `html` (`open: 'never'`) |
| `ci` | `retain-on-failure` | `off` | `only-on-failure` | `github` when `GITHUB_ACTIONS=true`, else `dot`; `html` (`open: 'never'`); `junit` → `reports/junit.xml` |
| `production` | `off` | `off` | `off` | `list`, `junit` → `reports/junit.xml` |

Local tracing is `retain-on-failure` (ADR 0003 proposed `on`): traces are kept only where they are needed. The presets set nothing else: retries, workers, timeouts and logger options remain the project's.

### Overrides and precedence
- `artifacts`: individual settings replace the preset's (`undefined` is ignored).
- `reporters.replace`: the complete list. Combining it with `html`, `junit`, `json` or `extra` is a `PresetError`, so there is no hidden precedence between them.
- Without `replace`, in this order: the preset's list; `html`/`junit` (`false` drops the reporter, an object is merged over the preset's options, or adds the reporter where the preset has none); `json` (off by default; `true` or options add `reports/results.json`); every `extra` entry, in order.
- A built-in reporter may appear only once (configure it through its option instead).
- Native Playwright still wins at run time: CLI `--reporter`/`--trace`, `PLAYWRIGHT_HTML_OUTPUT_DIR`, `PLAYWRIGHT_HTML_OPEN` and the like.

### Production reporter rules (same for `extra` and `replace`)
- `html` and `blob` are never allowed, even when approved: they package screenshots, videos and traces (ADR 0003). `reporters.html` options are rejected in production.
- Console reporters (`list`, `dot`, `line`, `github`), `junit`, `json` and `null` need no approval.
- Any other reporter (Allure, ReportPortal, a custom file) needs `{ reporter: [...], allowInProduction: true }`. Approvals are ignored outside production.
- The guard stays the final authority: `assertProductionSafe` checks the merged config, so an unsafe `artifacts` override in production is still blocked (tested), and the runtime fixture still catches CLI flags.

### Output paths
- Report files go to `reports/` (JUnit, JSON); the HTML report stays in `playwright-report/`. `reports/`, `allure-results/` and `allure-report/` are gitignored.
- The presets set the HTML folder **explicitly**. Playwright resolves an explicit reporter path from the config file's folder (like `outputDir`), but a missing one from the nearest `package.json`'s folder (`resolveReporterOutputPath`). Found by the nested test: a copy without `package.json` wrote its HTML report two folders up. Explicit paths keep every preset path on one base.
- `qaPreset` rejects: a report path (`outputFile`, `outputFolder`, `outputDir`, `resultsDir`) inside `outputDir` (Playwright clears it at the start of every run; pass `outputDir` if you changed it); a report path inside an HTML report folder (the HTML reporter replaces it); an HTML folder overlapping `outputDir`; two reporters writing the same path.

## Evidence
- Nested runs (no browser; one passing, one failing test): `ci` wrote `reports/junit.xml` and `playwright-report/index.html`, finished without opening the report, and kept one trace (the failed test's). `local` wrote the HTML report, no `reports/`, one trace. A production profile wrote only `reports/junit.xml`: no trace, video, screenshot, HTML or blob output, and the guard (`reporters: 'error'`) passed. A production profile with `QA_CORTEX_PRESET=local` stopped with `PresetError` before any report was written.
- With the guard: every allowed production variant (`json`, `extra` console reporter, approved third-party reporter, `replace`) has no violations; `local` and `ci` fail it in production.
- `automation/`: a clean `demo:production` run wrote only `reports/junit.xml` and Playwright's `.last-run.json`.

## Limits (documented)
- **Disabling artifacts is not complete protection.** With trace, video and screenshot off, secrets can still reach: console output and `qaLog` lines that were not redacted (ADR 0007 limits), error and assertion messages (Playwright records `expect()` arguments), JUnit `system-out`/`system-err` and JSON results (which carry test output, errors and attachments), attachments added by tests, server or proxy logs, screenshots or traces started by test code, and whatever a third-party reporter collects. ADR 0003 and 0008 still apply.
- **No claims about third-party reporters.** What Allure or any other reporter stores (attachments, steps, output) is that reporter's behaviour; QA Cortex neither inspects nor changes it, hence the production approval.
- **Path checks are static.** They compare the paths in the preset result with the `outputDir` you pass. They cannot see a different `outputDir` set elsewhere, per-project output folders, environment overrides such as `PLAYWRIGHT_HTML_OUTPUT_DIR`, or a `replace`d `['html']` without `outputFolder` (resolved by Playwright from the nearest `package.json`; the check assumes `playwright-report` next to the config).
- **No performance claims.** Retaining traces or videos only for failures records them during every test and deletes them afterwards; actual cost depends on the project.
- Videos and screenshots were not exercised by the framework tests (no browser in framework CI); they are Playwright's own options, passed through unchanged.

## Allure (documented only; a working example is planned for Step 9G)
Install `allure-playwright` in the test project (not in QA Cortex) and add it through `extra`:

```ts
qaPreset(name, { reporters: { extra: [['allure-playwright', { resultsDir: 'allure-results' }]] } });
// in production it must be approved explicitly:
qaPreset('production', { reporters: { extra: [{ reporter: ['allure-playwright', { resultsDir: 'allure-results' }], allowInProduction: true }] } });
```

`resultsDir` is checked like every other report path. Allure results are secret-bearing in the same way as Playwright's HTML report when artifacts are on.

## Seams for Phase 2 and 3 (not implemented)
- **API automation:** traces also record API requests and their headers, so these artifact settings apply as they are; an API package can export its own preset objects in the same plain shape. No registry.
- **Agentic AI:** `reporters.json` gives machine-readable results that a future triage agent could read. Nothing is built for that now.
