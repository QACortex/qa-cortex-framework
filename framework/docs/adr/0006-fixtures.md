# ADR 0006 — Fixtures: plain fixture objects for the user's own `test.extend()`

- Status: accepted (Step 5A, 2026-11-23)
- Code: `packages/core/src/config/fixtures.ts`
- Tests: `packages/core/test/config/fixtures.spec.ts` (nested Playwright project in `test/fixtures/pw-fixtures/`), `packages/core/test/types/fixtures.types.ts`
- Versions verified: `@playwright/test` 1.65.1 at runtime; the `Fixtures` type is identical in 1.60.0 and 1.65.1

## Context
Users and future QA Cortex modules (logger, test data, sessions) need the loaded config inside tests and fixtures. Before this ADR, the demo and our integration test each hand-wrote an option fixture and passed the whole loaded config object through `use`. That has three problems:
1. **No shared fixture name** that other modules could depend on.
2. **It relies on undocumented behaviour:** `use` objects only arrive intact because each worker re-runs `playwright.config.ts` (ADR 0002).
3. **Several profiles in one run** require loading and passing an object per project.

Playwright already provides everything about fixture lifecycle: `test.extend()`, worker and test scopes, option fixtures, `test.use()`, `mergeTests()` and `box`.

## Decision
1. **Each module exports plain fixture objects. QA Cortex never exports a `test`.** Users pass the objects to their own `test.extend()`. Creating a `test` would need a runtime import of `@playwright/test`, which ADR 0001 forbids (a second Playwright copy throws). Core keeps `import type` only.
2. **Fixtures live with their module,** on that module's subpath, not in a separate package. The config fixtures come from `@qa-cortex/core/config`. A future logger would export its own from `@qa-cortex/core/logger`. There's no `@qa-cortex/ui` until UI features exist.
3. **The config fixture contract.** Other modules and user fixtures depend on these names:
   | Name | Scope | Kind | Type |
   |---|---|---|---|
   | `qaProfile` | worker | option, default `undefined` | `string \| undefined` |
   | `qaConfig` | worker | fixture, depends on `qaProfile`, boxed | `LoadedConfig<z.output<S>>` (= `ConfigOf<S>`) |

   - `qaConfig` runs `loadConfig(definition, { profile: qaProfile })` once per worker, lazily.
   - With no `qaProfile`, the normal order applies: `QA_CORTEX_PROFILE`, then `defaultProfile`, then `local`.
   - The option carries a **profile name** (a string), not a config object, so nothing depends on how Playwright transfers `use` values.
4. **Scopes:**
   - Immutable, per-worker data (config) is worker-scoped.
   - Per-test state (logging, test data, cleanup) will be test-scoped in its own module, and may depend on `qaConfig`.
   - Fixtures keep no module-level state.
5. **API:**
   ```ts
   configFixtures<S>(definition: ConfigDefinition<S>): Fixtures<object, ConfigWorkerFixtures<S>>
   type ConfigWorkerFixtures<S> = { qaProfile: string | undefined; qaConfig: LoadedConfig<z.output<S>> }
   ```

## Usage
```ts
export const test = base.extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig));
// playwright.config.ts (optional, several profiles in one run):
projects: [{ name: 'staging', use: { qaProfile: 'staging', baseURL: loadConfig(qaConfig, { profile: 'staging' }).baseURL } }]
```
Calling `loadConfig()` at the top of `playwright.config.ts` is still recommended, for two reasons:
- it fails fast in the main process
- it's where `baseURL` is mapped explicitly

It's pure and costs microseconds.

## Evidence
**Nested Playwright run** (2 projects, 2 workers, 7 tests each):
- `qaConfig` is typed and frozen.
- It's **the same object for every test in a worker**, and **loaded exactly once per worker**, measured with a test-only counting schema. More than one worker took part.
- `qaProfile` per project overrides `QA_CORTEX_PROFILE`, and with no `qaProfile` the variable applies.
- An unknown profile fails the affected tests with the readable `ConfigError`, while projects that set `qaProfile` keep passing.
- A dependent test-scoped fixture receives `qaConfig`, and `mergeTests()` works.

**Type tests** (one invalid case per statement, 6 cases each confirmed to fire):
- the fields come from the user's schema, and `qaConfig` is readonly
- `qaProfile: string | undefined`, accepted in `test.use()` and project `use`, wrong types rejected
- `test.extend()` composes, and `mergeTests()` keeps the types
- a mismatched schema is rejected, and `base.extend(configFixtures(def))` **infers** the types even without the explicit generic

**No cast was needed** in the implementation. The emitted JS contains no reference to `@playwright/test`.

## Constraints learned
- **Where `test.use({ qaProfile })` can go:** Playwright only allows it **at the top level of a file** (or in the config). Inside `describe()` it throws, because a worker option forces a new worker.
- **Keep the profile sources in step:** when `qaProfile` differs per project, derive that project's `baseURL` from the same profile (as in the usage above). Otherwise the two can disagree.

## Risks
- **Our type files expose Playwright's `Fixtures` type.** A Playwright type change can reach our users. CI must type-check against Playwright 1.60.0 and latest (ADR 0001 required test 2).
- **Fixture names `qaConfig`/`qaProfile` are now a public contract.** Renaming them later is a breaking change.

## Alternatives rejected
- **Document the recipe only:** no contract for future modules, and it keeps passing objects through `use`.
- **Export a ready-made `test`:** needs a runtime Playwright import (ADR 0001).
- **A `@qa-cortex/ui` package now:** nothing UI-specific exists yet.
- **A fixture container or registry class:** a wrapper abstraction (CLAUDE.md).
