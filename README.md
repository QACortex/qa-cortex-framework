# QA Cortex

A thin, composition-first extension layer over [Playwright](https://playwright.dev) (TypeScript).
It is not a framework with its own runtime: raw Playwright always stays usable.

> Status: early development. Nothing is published yet.

## Repository structure

```
packages/
  core/                 @qa-cortex/core (ESM-only, subpath exports)
    src/config/         @qa-cortex/core/config (typed, layered config; see ADR 0002)
    src/logger/         @qa-cortex/core/logger (structured, redacting logging; see ADR 0007)
    test/               package tests, run against the built output
      types/            compile-only type tests (checked by `npm run typecheck`)
      fixtures/         nested Playwright projects run by the integration tests
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
| `npm run pack:check` | After a build: dry-run `npm pack` of `@qa-cortex/core`; fails if an `exports` target, `LICENSE` or `package.json` would be missing, or if build caches or tests would be published. Nothing is published. |
| `npm run pack:lint` | After a build: `publint --strict` and Are the Types Wrong (`attw --profile esm-only`) on the packed package (ADR 0001). |
| `npm run clean` | Removes build output. |

CI (`.github/workflows/ci.yml`) runs `npm ci`, then `build`, `typecheck`, `lint`, `test` and
`pack:check` on Ubuntu with Node.js 22, for pushes and pull requests to `main`.

Compatibility (`.github/workflows/compatibility.yml`, on pull requests to `main` and on demand)
packs `@qa-cortex/core` once, runs `pack:check` and `pack:lint` once, then installs the
**tarball** into isolated CommonJS and ESM consumer projects on Ubuntu and Windows ×
Node.js 22.12.0 / 24 / 26 × Playwright 1.60.0 / 1.65.1. To run one consumer locally after
`npm run build` and `npm pack --workspace @qa-cortex/core --pack-destination <dir>`:

```powershell
node compat/run-consumer.mjs --tarball <dir> --playwright 1.65.1 --format cjs --install-browser
```

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

## Logging (`@qa-cortex/core/logger`)

Structured, levelled, **redacting** logging. Independent of the config module.

```ts
// tests/fixtures.ts: compose with your own test.extend()
import { loggerFixtures, type LoggerTestFixtures, type LoggerWorkerFixtures } from '@qa-cortex/core/logger';

export const test = base.extend<LoggerTestFixtures, LoggerWorkerFixtures>({
  ...loggerFixtures(),
  // secrets come from code (a vault, env), never from `use`
  qaSecrets: [async ({}, use) => use([process.env.ADMIN_PASSWORD ?? '']), { scope: 'worker' }],
});

// any spec
test('checkout', async ({ page, qaLog }) => {
  qaLog.info('opening cart', { items: 2 });   // [info] opening cart {"items":2}
  qaLog.child({ page: 'payment' }).warn('slow'); // [warn] [page=payment] slow
});
```

| Fixture | Scope | Default | |
|---|---|---|---|
| `qaLog` | test | | logger for this test |
| `qaLogLevel` | worker option | `'info'` | `'debug' \| 'info' \| 'warn' \| 'error'` |
| `qaLogAttach` | worker option | `'on-failure'` | `'always' \| 'on-failure' \| 'off'`: per-test `qa-cortex-log.jsonl` with test metadata |
| `qaSecrets` | worker fixture | `[]` | secret values to redact; override in code |

- Every line goes to stdout/stderr, which Playwright captures per test, and the JSON Lines
  attachment records title, project, worker, retry and test id.
- Outside tests: `createLogger({ level, redact, sink })`. A sink that throws makes that
  logging call throw (nothing is swallowed or retried); the logger keeps working afterwards.

### What redaction does and does not cover

Redaction runs **before** the logger writes anything, in two layers:

1. **Known secret values** from `qaSecrets` / `redact`, replaced with `[REDACTED]` wherever they
   appear, plain or URL-encoded. This is **best effort**: a secret that is transformed (hashed,
   base64-encoded, split, sliced or concatenated) is not recognised. **Values shorter than
   4 characters are never redacted**; they are ignored so that common short strings are not
   wiped from every line.
2. **Sensitive key names** in structured data: values under keys such as `password`, `token`,
   `secret`, `authorization`, `cookie`, `apiKey`, `credential`, `privateKey` are always replaced,
   whatever their value. A secret under an innocent key name is only caught by layer 1.

It applies **only to output generated by the QA Cortex logger** (its console lines and its
`qa-cortex-log.jsonl` attachment). It does **not** redact anything Playwright records itself:
**traces, screenshots, videos, network traffic (HAR and trace network logs), action parameters,
assertion messages and failure output**, or reports built from them. Treat those artifacts as
secret-bearing and keep traces off in production. See
[ADR 0003](docs/adr/0003-s3-trace-secrets.md) and [ADR 0007](docs/adr/0007-logging.md).

## Key decisions

- **ESM-only.** Packages expose subpaths only (`@qa-cortex/core/config`), never the package root. CommonJS projects load them through `require()` of ESM, which needs Node 22.12+ and, for type-checking with `nodenext`, TypeScript 5.8+. See [ADR 0001](docs/adr/0001-s1-module-format.md).
- **One compiler.** TypeScript 6.0.3, pinned exactly. See [ADR 0005](docs/adr/0005-single-compiler-typescript-6.md).
- **Playwright is a peer dependency** (`>=1.60.0 <2`). Core only imports its types.

## Licence

[MIT](LICENSE)
