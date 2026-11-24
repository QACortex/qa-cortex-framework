# QA Cortex

A thin, composition-first extension layer over [Playwright](https://playwright.dev) (TypeScript).
It is not a framework with its own runtime: raw Playwright always stays usable.

> Status: early development. Nothing is published yet.

## Repository structure

One GitHub repository, two independent npm projects, each with its own `package.json` and
lockfile:

```
framework/              framework development and npm packaging (see framework/README.md)
  packages/core/        @qa-cortex/core: config (ADR 0002), logger (ADR 0007), secrets and guard (ADR 0008)
  compat/               packed-package consumer checks
  docs/adr/             architecture decision records (start here)
  spikes/               M0 technical spikes, kept as history
automation/             ready-to-use automation project (see automation/README.md)
  tests/ui/             browser tests (public websites; not part of framework CI)
  vendor/               packed @qa-cortex/core tarball until the package is published
.github/workflows/      CI and Compatibility, both run inside framework/
```

## Using QA Cortex in a test project

```powershell
cd automation
npm run framework:pack
npm install file:vendor/qa-cortex-core.tgz
Copy-Item .env.example .env
npm run demo:local
```

See [automation/README.md](automation/README.md) for every demo and command.

Until `@qa-cortex/core` is published, `automation/` installs it from a packed tarball
(`file:vendor/qa-cortex-core.tgz`). This is temporary: it must be replaced with the published
npm dependency before Release 1 (steps in [automation/README.md](automation/README.md#setup-once-inside-automation)).

## Requirements

- Node.js >= 22.12
- npm

## Working on the framework

```powershell
cd framework
npm ci
npm test
```

All framework commands (build, typecheck, lint, test, package checks), the CI workflows and
the compatibility matrix are described in [framework/README.md](framework/README.md).
Browser tests that visit public websites are not part of the framework checks.

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
- When projects use different profiles, derive each project's `baseURL` from the same profile. See [ADR 0006](framework/docs/adr/0006-fixtures.md).

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
[ADR 0003](framework/docs/adr/0003-s3-trace-secrets.md) and [ADR 0007](framework/docs/adr/0007-logging.md).

## Secrets (`@qa-cortex/core/secrets`)

Declare which environment variable holds each secret, per profile; load them once, validated.
Values come from the environment (CI secrets) or a local `.env` file, never from source code,
the config or Playwright's `use`.

```ts
// qa.secrets.ts
import { defineSecrets } from '@qa-cortex/core/secrets';

export const secretsDef = defineSecrets({
  adminPassword: { env: 'ADMIN_PASSWORD' },                                       // every profile
  apiToken: { env: { staging: 'STAGING_API_TOKEN', production: 'PROD_API_TOKEN' } }, // per profile
  basicAuth: { env: 'BASIC_AUTH_PASSWORD', optional: true },                       // may be unset
});
```

```ts
// playwright.config.ts: fails fast, before any worker starts
const qa = loadConfig(qaConfig);
const secrets = loadSecrets(secretsDef, { profile: qa.profile });
const basicAuth = secrets.find('basicAuth'); // optional and per-profile secrets: find()
export default defineConfig({
  use: {
    baseURL: qa.baseURL,
    // httpCredentials: the one auth channel ADR 0003 found does not leak into traces
    ...(basicAuth ? { httpCredentials: { username: 'qa', password: basicAuth.reveal() } } : {}),
  },
});

// tests/fixtures.ts: after loggerFixtures(), so every secret is redacted in qaLog
export const test = base
  .extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig))
  .extend<LoggerTestFixtures, LoggerWorkerFixtures>(loggerFixtures())
  .extend<object, SecretsWorkerFixtures<(typeof secretsDef)['entries']>>(secretsFixtures(secretsDef));

test('login', async ({ page, qaSecretStore }) => {
  const password = qaSecretStore.get('adminPassword'); // a Secret, typed: every profile has it
  await page.getByLabel('Password').fill(password.reveal()); // explicit reveal at the point of use
});
```

- A missing, empty or too-short (< 4 characters) value throws one `SecretsError` listing every
  problem by secret and variable name. Values are never printed.
- `secretsFixtures()` must come after `loggerFixtures()`. If it doesn't (chained, spread or
  `mergeTests()`), the automatic `qaSecretsCheck` fixture fails every worker before any test
  runs, instead of letting redaction be switched off silently.
- Never pass a secret to `expect()`: Playwright records assertion values in traces and reports.
- `get()` accepts only secrets every profile has; read `optional` and per-profile secrets with
  `find()`, which returns `undefined` when absent.
- A `Secret` prints as `[REDACTED]` (`String()`, templates, JSON, `console.log`); `reveal()` is
  the only way to the value. Once revealed it is an ordinary string: whatever receives it, such
  as `fill()`, can record it in a trace ([ADR 0003](framework/docs/adr/0003-s3-trace-secrets.md)).
- No `.env` parser is bundled: use Node's `process.loadEnvFile()` (see `automation/playwright.config.ts`).
  `.env` files are gitignored; commit only `.env.example` with placeholders.

## Production guard (`@qa-cortex/core/guard`)

For a profile with `production: true`, refuses to run if Playwright would record artifacts that
can contain secrets. It checks and never changes your settings.

```ts
// playwright.config.ts: static check of the root config and every project
const config = defineConfig({ use: { trace: qa.production ? 'off' : 'retain-on-failure' } });
assertProductionSafe(config, { production: qa.production });
export default config;

// tests/fixtures.ts: runtime check, also catches --trace on and test.use({ trace })
.extend<object, ProductionGuardWorkerFixtures>(productionGuardFixtures())
```

- Production requires `trace: 'off'`, `video: 'off'` and `screenshot: 'off'` (or
  `'only-on-failure'` with `allowScreenshotsOnFailure: true`). Unknown modes fail closed.
- HTML and blob reporters give a warning (`reporters: 'error'` makes them an error).
- The runtime fixture fails the worker before a browser launches. Limits, such as UI mode and
  tracing started by test code, are listed in [ADR 0008](framework/docs/adr/0008-secrets-and-production-guard.md).

## Key decisions

- **ESM-only.** Packages expose subpaths only (`@qa-cortex/core/config`), never the package root. CommonJS projects load them through `require()` of ESM, which needs Node 22.12+ and, for type-checking with `nodenext`, TypeScript 5.8+. See [ADR 0001](framework/docs/adr/0001-s1-module-format.md).
- **One compiler.** TypeScript 6.0.3, pinned exactly. See [ADR 0005](framework/docs/adr/0005-single-compiler-typescript-6.md).
- **Playwright is a peer dependency** (`>=1.60.0 <2`). Core only imports its types.

## Licence

[MIT](LICENSE)
