# QA Cortex

A thin, composition-first extension layer over [Playwright](https://playwright.dev) (TypeScript).
It is not a framework with its own runtime: raw Playwright always stays usable.

> Status: early development. Nothing is published yet.

## Repository structure

```
packages/
  core/                 @qa-cortex/core (ESM-only, subpath exports)
    src/config/         @qa-cortex/core/config (typed, layered config; see ADR 0002)
    test/               package tests, run against the built output
      types/            compile-only type tests (checked by `npm run typecheck`)
      fixtures/         nested Playwright project used by the integration test
examples/
  config-demo/          runnable demo of @qa-cortex/core/config (see its README)
docs/adr/               architecture decision records (start here)
spikes/                 M0 technical spikes (S0–S4), kept as history; not built or linted
tsconfig.base.json      shared compiler settings
eslint.config.js        lint rules (type-aware)
playwright.config.ts    test runner for package tests
```

## Requirements

- Node.js >= 22.12
- npm (workspaces)

## Development commands

Run from the repository root:

| Command | What it does |
|---|---|
| `npm install` | Installs all workspace dependencies. |
| `npm run build` | Compiles every package with `tsc -b` (JS, `.d.ts`, declaration maps). |
| `npm run typecheck` | Builds, then type-checks the tests, root tool configs and the examples against the built packages. |
| `npm run lint` | Runs ESLint with type-aware rules (packages and examples). |
| `npm test` | Builds, then runs the package tests with Playwright Test. |
| `npm run clean` | Removes build output. |

`npm test` runs only `packages/*/test`. The browser tests in `examples/` visit public
websites, so they are **not** part of the mandatory suite; run them from each example's
folder (see `examples/config-demo/README.md`).

## Configuration (`@qa-cortex/core/config`)

Layered, validated, frozen configuration. Precedence: schema defaults → `base` → selected
profile → `overrides`. The profile comes from `loadConfig({ profile })`, then the
`QA_CORTEX_PROFILE` environment variable, then `defaultProfile`, then `"local"`.

```ts
// qa.config.ts
import { coreSchema, defineQaConfig, z, type ConfigOf } from '@qa-cortex/core/config';

export const schema = coreSchema.extend({
  app: z.strictObject({ tenant: z.string() }), // use the re-exported `z`
});
export type AppConfig = ConfigOf<typeof schema>;

export const qaConfig = defineQaConfig({
  schema, // omit to use coreSchema as-is
  base: { baseURL: 'http://localhost:3000', app: { tenant: 'acme' } },
  profiles: {
    local: {},
    staging: { baseURL: 'https://staging.example.com' },
  },
});
```

```ts
// playwright.config.ts: Playwright's own config stays in charge
import { defineConfig } from '@playwright/test';
import { loadConfig } from '@qa-cortex/core/config';
import { qaConfig } from './qa.config.js';

const qa = loadConfig(qaConfig); // validates now; a bad profile fails before any worker starts

export default defineConfig({
  use: { baseURL: qa.baseURL },
});
```

- Invalid config throws a `ConfigError` listing every issue with the layer that caused it
  (`[profile "staging"]`, `[not set in base, profile "staging"]`). Values are never printed.
- The result is deep-frozen; `profile` holds the selected profile name.
- `api` and `ai` are reserved top-level sections for future packages.
- The core schema holds only `baseURL`, `production`, `api` and `ai`. Playwright settings
  (timeouts, retries, workers) stay in Playwright's config. To vary one per profile, add
  your own field and map it explicitly:

  ```ts
  const schema = coreSchema.extend({
    timeouts: z.strictObject({ action: z.number().int().nonnegative() }).optional(),
  });
  // playwright.config.ts
  use: { baseURL: qa.baseURL, actionTimeout: qa.timeouts?.action },
  ```

### Config in tests: `configFixtures()`

Add the config fixtures to **your own** `test` with Playwright's `test.extend()`. QA Cortex
never replaces `test` or `expect`.

```ts
// tests/fixtures.ts
import { test as base } from '@playwright/test';
import { configFixtures, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { qaConfig, type schema } from '../qa.config.js';

export const test = base.extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig));

// any spec
test('uses the config', async ({ page, qaConfig }) => {
  await page.goto('./');
  // qaConfig is typed from your schema, frozen, and loaded once per worker
});
```

| Fixture | Scope | What it is |
|---|---|---|
| `qaConfig` | worker | the validated config for this worker's profile |
| `qaProfile` | worker option | profile for a Playwright project: `use: { qaProfile: 'staging' }`; unset means `QA_CORTEX_PROFILE`, then `local` |

- Your own fixtures can depend on `qaConfig` by name, and the fixtures combine with `mergeTests()`.
- `test.use({ qaProfile })` must sit at the top level of a spec file (Playwright rule for worker options), not inside `describe()`.
- When projects use different profiles, derive each project's `baseURL` from the same profile. See [ADR 0006](docs/adr/0006-fixtures.md).

## Key decisions

- **ESM-only.** Packages expose subpaths only (`@qa-cortex/core/config`), never the package root. CommonJS projects load them through `require()` of ESM, which needs Node 22.12+ and, for type-checking with `nodenext`, TypeScript 5.8+. See [ADR 0001](docs/adr/0001-s1-module-format.md).
- **One compiler.** TypeScript 6.0.3, pinned exactly. See [ADR 0005](docs/adr/0005-single-compiler-typescript-6.md).
- **Playwright is a peer dependency** (`>=1.60.0 <2`). Core only imports its types.

## Licence

[MIT](LICENSE)
