# QA Cortex feature inventory

Every capability of this repository on `main`, where it comes from, and where it is documented.
Release 1 covers GUI/web automation only.

**Status:**
- **Implemented:** on `main`, tested and documented.
- **Partial:** usable, with a stated gap.
- **In development:** work has started but is not on `main`; not usable yet.
- **Pending:** planned for Release 1, not started.
- **Deferred:** a later release.

**Category:**
- **Playwright:** native, configured or used, never wrapped.
- **QA Cortex core:** `@qa-cortex/core`, in `framework/`.
- **Starter project:** `automation/`.
- **Third-party:** an external library or service.

Paths are relative to the repository root.

## QA Cortex core (`@qa-cortex/core`)

| Feature | Status | Category | Reference |
|---|---|---|---|
| Typed configuration: schema (Zod), `base` plus environment profiles, validated at startup, frozen; `defineQaConfig`, `loadConfig`, `ConfigError` | Implemented | QA Cortex core | [README: Configuration](../../README.md#configuration-qa-cortexcoreconfig), [ADR 0002](adr/0002-s2-config-merge.md), `framework/packages/core/src/config/` |
| Config fixtures `qaConfig`, `qaProfile` (`configFixtures`) | Implemented | QA Cortex core | [README: Config in tests](../../README.md#config-in-tests-configfixtures), [ADR 0006](adr/0006-fixtures.md) |
| Reserved `api` and `ai` config sections (seam for later packages) | Implemented (seam only) | QA Cortex core | [ADR 0002](adr/0002-s2-config-merge.md) |
| Structured, levelled logging with redaction: `qaLog`, `qaLogLevel`, `qaLogAttach`, `qaSecrets`, `createLogger`, the `qa-cortex-log.jsonl` attachment | Implemented | QA Cortex core | [README: Logging](../../README.md#logging-qa-cortexcorelogger), [ADR 0007](adr/0007-logging.md) |
| Secrets per profile: `defineSecrets`, `loadSecrets`, `Secret` (`reveal()`), `secretsFixtures` (`qaSecretStore`), `qaSecretsCheck` | Implemented | QA Cortex core | [README: Secrets](../../README.md#secrets-qa-cortexcoresecrets), [ADR 0008](adr/0008-secrets-and-production-guard.md) |
| Production guard: `assertProductionSafe` (static), `productionGuardFixtures` (runtime, catches `--trace on`) | Implemented | QA Cortex core | [README: Production guard](../../README.md#production-guard-qa-cortexcoreguard), [ADR 0003](adr/0003-s3-trace-secrets.md), [ADR 0008](adr/0008-secrets-and-production-guard.md) |
| Reporter and artifact presets `local`, `ci`, `production`: `qaPreset`, `selectPreset`, path checks | Implemented | QA Cortex core | [README: Presets](../../README.md#reporter-and-artifact-presets-qa-cortexcorepresets), [ADR 0009](adr/0009-reporter-artifact-presets.md) |
| ESM-only package with subpath exports; Playwright as a peer dependency (`>=1.60.0 <2`) | Implemented | QA Cortex core | [ADR 0001](adr/0001-s1-module-format.md), `framework/packages/core/package.json` |
| Framework CI (build, type-check, lint, tests, package checks) and compatibility matrix (Linux and Windows; Node 22.12, 24, 26; Playwright 1.60 and 1.65) | Implemented | QA Cortex core | [framework/README.md](../README.md), `.github/workflows/ci.yml`, `.github/workflows/compatibility.yml` |
| Authentication: roles and sessions for browser and API (`storageState` plus headers and tokens), cross-process locking | **In development** (paused; not on `main`, not usable yet) | QA Cortex core | [ADR 0004](adr/0004-s4-sessions.md) (design) |
| Cleanup registry (backend-agnostic teardown fixture) | **Pending** | QA Cortex core | CLAUDE.md, Phase 1 module 4 |
| Shared ESLint config and tsconfig packages | **Pending** (waits on the ESLint 9 → 10 decision) | QA Cortex core | CLAUDE.md, Phase 1 module 7 |
| Publishing `@qa-cortex/core` to npm | **Pending** (the starter project uses a packed tarball until then) | QA Cortex core | [automation/README.md: Setup](../../automation/README.md#setup-once-inside-automation) |
| API automation package (`@qa-cortex/api`) | **Deferred** (Phase 2) | QA Cortex core | CLAUDE.md |
| AI agent package (`@qa-cortex/ai`) | **Deferred** (Phase 3) | QA Cortex core | CLAUDE.md |

## Starter project (`automation/`)

| Feature | Status | Category | Reference |
|---|---|---|---|
| One-command setup: `npm run setup` (pack framework, install, `.env`, browsers) | Implemented | Starter project | [Setup](../../automation/README.md#setup-once-inside-automation), `automation/scripts/setup.mjs` |
| Page Object Model: plain classes, typed locators, no base class | Implemented | Starter project | [Writing tests](../../automation/README.md#writing-tests), `automation/pages/` |
| Reusable UI component by composition (`ScenarioMenu`) | Implemented | Starter project | `automation/components/scenario-menu.ts` |
| Page object fixtures (`textBoxPage`, `checkBoxPage`, `dropdownPage`, `textValidationPage`) on the project's own `test` | Implemented | Starter project | `automation/tests/fixtures.ts` |
| JSON test data (native import attributes, typed) | Implemented | Starter project | `automation/data/` |
| Data-driven tests (native parameterisation: one test per record) | Implemented | Starter project | `automation/tests/ui/*.spec.ts` |
| Sample tests for the QA Cortex Test Automation Lab: navigation, text box, check box, dropdown, text validation (20 tests), plus site and logging demos | Implemented | Starter project | `automation/tests/ui/` |
| Environment profiles `local`, `staging`, `production` (simulated) | Partial: all three point at the one public lab host, so only labels differ | Starter project | [Profiles](../../automation/README.md#profiles), `automation/qa.config.ts` |
| Secrets from `.env` locally and repository secrets in CI | Implemented | Starter project | [Secrets](../../automation/README.md#secrets-env), `automation/qa.secrets.ts`, `automation/.env.example` |
| Demonstration scripts (profiles, invalid config, logging, failure attachments, production guard, CI preset) | Implemented | Starter project | [Run the demonstrations](../../automation/README.md#run-the-demonstrations) |
| Execution scripts: `test`, `test:chromium` / `firefox` / `webkit` / `all`, `test:smoke`, `test:regression`, `test:headed`, `test:ui`, `test:debug` | Implemented | Starter project | [Running tests](../../automation/README.md#running-tests) |
| Test data clean-up | Not demonstrated: the lab tests create no server-side data. The pattern is native fixture teardown; QA Cortex's cleanup registry is pending | Starter project | [Writing tests](../../automation/README.md#writing-tests) |
| Authentication example (login once, reuse the session) | **Pending** (waits for the QA Cortex sessions module) | Starter project | — |
| Manual user acceptance checklist | Implemented | Starter project | [automation/docs/acceptance-checklist.md](../../automation/docs/acceptance-checklist.md) |

## Playwright (native, configured in the starter project)

| Feature | Status | Category | Reference |
|---|---|---|---|
| Test runner, fixtures (`test.extend`), locators, web-first assertions | Implemented (used as is) | Playwright | [playwright.dev](https://playwright.dev/docs/intro) |
| Chromium, Firefox and WebKit projects; `npm test` runs Chromium | Implemented | Playwright | `automation/playwright.config.ts` |
| Parallel execution (`fullyParallel`; workers: local default, 2 in CI) | Implemented | Playwright | [Running tests](../../automation/README.md#running-tests) |
| Retries (0 locally, 2 in CI) and timeouts (30 s per test, 5 s per assertion) | Implemented | Playwright | `automation/playwright.config.ts` |
| Tags `@smoke` and `@regression`; filtering by tag, browser, file and name | Implemented | Playwright | [Running tests](../../automation/README.md#running-tests) |
| Headless (default), headed, UI mode, debug mode (Inspector) | Implemented (UI and debug are interactive; launch checked, not used end to end) | Playwright | [Running tests](../../automation/README.md#running-tests) |
| Reporters: list, dot, github, HTML, JUnit (chosen by the QA Cortex presets) | Implemented | Playwright | [Reports](../../automation/README.md#reports) |
| Traces, screenshots and videos on failure (set by the presets) | Implemented | Playwright | [Reports](../../automation/README.md#reports) |
| API requests (`request` fixture) | Available natively; not demonstrated (API automation is a later phase) | Playwright | [playwright.dev](https://playwright.dev/docs/api-testing) |
| Visual comparison (`toHaveScreenshot`) | **Deferred** (not demonstrated) | Playwright | [playwright.dev](https://playwright.dev/docs/test-snapshots) |

## Third-party integrations

| Feature | Status | Category | Reference |
|---|---|---|---|
| Zod 4: configuration schemas (re-exported as `z`) | Implemented | Third-party (core dependency) | [ADR 0002](adr/0002-s2-config-merge.md) |
| Allure: `allure-playwright` results in the `local` and `ci` presets (off in `production`); Allure 3 report (`npm run allure:generate`, `allure:open`) | Implemented | Third-party (starter dev dependency) | [Reports](../../automation/README.md#reports) |
| GitHub Actions automation workflow: manual, with browser, profile and tag inputs, framework build, checks, tests, reports uploaded even on failure (14 days) | Implemented (manual only; never a pull-request check) | Third-party (GitHub Actions) | [GitHub Actions](../../automation/README.md#github-actions), `.github/workflows/automation.yml` |
| Test data generators (Faker), CSV and Excel data | **Deferred** | Third-party | — |
| Accessibility checks (`@axe-core/playwright`) | **Deferred** | Third-party | — |
| Allure TestOps, hosted reports (GitHub Pages) | **Deferred** (out of scope) | Third-party | — |

## Known limitations (all releases so far)

- **Not published:** `@qa-cortex/core` is not on npm yet. The starter project builds and installs it from `framework/` (`npm run setup`).
- **Redaction covers QA Cortex's own logging only.** Playwright's traces, screenshots, videos, reports and Allure results are not redacted, so treat them as sensitive ([ADR 0003](adr/0003-s3-trace-secrets.md)).
- **Public application under test.** The sample tests depend on the public QA Cortex Test Automation Lab, so they are not part of the framework's CI.
- **Node versions:** Node.js 22.12 or later for `@qa-cortex/core`, 22.18 or later for the starter project (Allure 3).
- **Platforms:** the framework's compatibility matrix covers Linux and Windows; macOS is not tested.
