# QA Cortex

A thin, composition-first extension layer over [Playwright](https://playwright.dev) (TypeScript).
It is not a framework with its own runtime: raw Playwright always stays usable.

> Status: early development. Nothing is published yet.

## Repository structure

```
packages/
  core/                 @qa-cortex/core (ESM-only, subpath exports)
    src/config/         @qa-cortex/core/config (placeholder; see ADR 0002)
    test/               package tests, run against the built output
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
| `npm run typecheck` | Builds, then type-checks the tests against the built packages. |
| `npm run lint` | Runs ESLint with type-aware rules. |
| `npm test` | Builds, then runs the package tests with Playwright Test. |
| `npm run clean` | Removes build output. |

## Key decisions

- **ESM-only.** Packages expose subpaths only (`@qa-cortex/core/config`), never the package root. CommonJS projects load them through `require()` of ESM, which needs Node 22.12+ and, for type-checking with `nodenext`, TypeScript 5.8+. See [ADR 0001](docs/adr/0001-s1-module-format.md).
- **One compiler.** TypeScript 6.0.3, pinned exactly. See [ADR 0005](docs/adr/0005-single-compiler-typescript-6.md).
- **Playwright is a peer dependency** (`>=1.60.0 <2`). Core only imports its types.

## Licence

[MIT](LICENSE)
