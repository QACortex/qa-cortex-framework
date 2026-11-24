# QA Cortex framework

The npm project that develops and packages the `@qa-cortex/*` packages. It is independent
of the rest of the repository: its own `package.json`, `package-lock.json` and tooling.
Run every command below **inside this folder**.

## Layout

```
packages/
  core/                 @qa-cortex/core (ESM-only, subpath exports)
    src/config/         @qa-cortex/core/config (typed, layered config; see ADR 0002)
    src/logger/         @qa-cortex/core/logger (structured, redacting logging; see ADR 0007)
    src/secrets/        @qa-cortex/core/secrets (typed secrets per profile; see ADR 0008)
    src/guard/          @qa-cortex/core/guard (Production guard; see ADR 0003, ADR 0008)
    test/               package tests, run against the built output
      types/            compile-only type tests (checked by `npm run typecheck`)
      fixtures/         nested Playwright projects run by the integration tests
compat/                 packed-package consumer checks (run by the Compatibility workflow)
scripts/                package validation (check-package.mjs)
docs/adr/               architecture decision records (start here)
spikes/                 M0 technical spikes (S0–S4), kept as history; not built or linted
tsconfig.json           solution file: `tsc -b` builds every package
tsconfig.base.json      shared compiler settings for the packages
tsconfig.tools.json     type-checks the tool configs and scripts
eslint.config.js        lint rules (type-aware)
playwright.config.ts    test runner for the package tests
```

Paths quoted in the ADRs (`packages/…`, `spikes/…`) are relative to this folder.
Future packages (for example `packages/api`, `packages/ai`) are picked up by the
`packages/*` workspace glob and get a reference in `tsconfig.json`.

## Requirements

- Node.js >= 22.12
- npm

## Commands

| Command | What it does |
|---|---|
| `npm ci` | Installs exactly what `package-lock.json` pins. |
| `npm run build` | Compiles every package with `tsc -b` (JS, `.d.ts`, declaration maps). |
| `npm run typecheck` | Builds, then type-checks the package tests, the tool configs and the compat consumer template against the built packages. |
| `npm run lint` | Runs ESLint with type-aware rules. |
| `npm test` | Builds, then runs the package tests with Playwright Test (no browser needed). |
| `npm run pack:check` | After a build: dry-run `npm pack` of `@qa-cortex/core`; fails if an `exports` target, `LICENSE` or `package.json` would be missing, or if build caches or tests would be published. Nothing is published. |
| `npm run pack:lint` | After a build: `publint --strict` and Are the Types Wrong (`attw --profile esm-only`) on the packed package (ADR 0001). |
| `npm run clean` | Removes build output. |

## Continuous integration

- **CI** (`.github/workflows/ci.yml`) runs `npm ci`, `build`, `typecheck`, `lint`, `test` and
  `pack:check` in this folder, on Ubuntu with Node.js 22, for pushes and pull requests to `main`.
- **Compatibility** (`.github/workflows/compatibility.yml`, on pull requests to `main` and on
  demand) packs `@qa-cortex/core` once, runs `pack:check` and `pack:lint` once, then installs
  the **tarball** into isolated CommonJS and ESM consumer projects on Ubuntu and Windows ×
  Node.js 22.12.0 / 24 / 26 × Playwright 1.60.0 / 1.65.1.

To run one compatibility consumer locally:

```powershell
npm run build
npm pack --workspace @qa-cortex/core --pack-destination ../.pack
node compat/run-consumer.mjs --tarball ../.pack --playwright 1.65.1 --format cjs --install-browser
```

`npm test` runs only `packages/*/test`. Browser tests that visit public websites, or that
fail on purpose, live in the separate automation project and are not part of these checks.
