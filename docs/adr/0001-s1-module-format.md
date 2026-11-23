# ADR 0001 — S1 module format: ship ESM-only

- Status: accepted (spike S1, 2026-11-23)
- Spike code: `spikes/s1-module-format/` (throwaway)
- Versions tested: Node 26.13.1, TypeScript 7.0.2 (+ 6.0.3 API), `@playwright/test` 1.65.1 and 1.60.0, attw 0.18.5, publint 0.3.25

## Question
Can `@qa-cortex/core` ship as ESM only (no CommonJS build) and still work for every realistic consumer, at runtime and for types?

## Setup
- **Stub package:** `@qa-cortex/core@0.0.0-spike.1`, built with `tsc -b` (TS 7), packed with `npm pack` and installed from the tarball. It has:
  - two subpath exports, `./config` and `./logger`, and no root entry
  - an exported error class
  - module-level state
  - a type-only import of `@playwright/test`
- **Tarball:** 11 files, 2.1 kB. Contains `dist` and `src`, and no `tsbuildinfo`.
- **Consumers:**

| Consumer | What it exercises |
|---|---|
| `pw-cjs` | `"type": "commonjs"`; `playwright.config.ts` + worker fixture + spec, all `.ts` |
| `pw-esm` | same files, `"type": "module"` |
| `pw-cjs-160`, `pw-esm-160` | same as above, on Playwright 1.60.0 (our peer floor) |
| `plain-cjs` | `.cjs` using `require()` and `import()` side by side |

## Results

### Runtime: all green
| Check | cjs | esm | cjs @1.60 | esm @1.60 | plain-cjs |
|---|---|---|---|---|---|
| `playwright.config.ts` imports `/config` | ✅ | ✅ | ✅ | ✅ | n/a |
| worker fixture + spec share one module instance (state counter) | ✅ | ✅ | ✅ | ✅ | ✅ (`require` ≡ `import`) |
| `instanceof ConfigError` | ✅ | ✅ | ✅ | ✅ | ✅ |
| root import `@qa-cortex/core` blocked (`ERR_PACKAGE_PATH_NOT_EXPORTED`) | | | | | ✅ |
| process warnings (`ExperimentalWarning` etc.) | none | none | none | none | none |

A `ConfigError` thrown from `playwright.config.ts` exits 1 with a clear stack. The stack resolves to our shipped `src/*.ts` through the source maps, which confirms the "ship `src`" decision in ADR 0000.

### Types: consumer `module` setting matters
| Consumer tsconfig | CJS consumer | ESM consumer |
|---|---|---|
| `module: nodenext` | ✅ | ✅ |
| `module: node20` | ✅ | ✅ |
| `module: preserve` + `moduleResolution: bundler` | ✅ | ✅ |
| `module: node16` | ❌ TS1479 (thinks ESM can't be `require`d) | ✅ |
| `module: commonjs` + `moduleResolution: node10` | ❌ removed in TS 7 (TS5108); on TS 6 it can't see `exports` at all (TS2307) | — |

The runtime works in every case. These are type-check failures only, and Playwright itself doesn't type-check.

### Publish linting
- `publint`: all good.
- `attw` (default profile) fails on `node10` and "node16 from CJS: ESM (dynamic import only)". Cause: attw 0.18.5 bundles TypeScript 5.6.1-rc, which predates `require(esm)` support. These are the two cases ESM-only knowingly drops.
- `attw --profile esm-only`: passes.

### Top-level await
`require()` of an ESM module that uses top-level await throws `ERR_REQUIRE_ASYNC_MODULE`. This confirms the rule.

## Decision
1. **Ship ESM-only.** Use `"type": "module"`, an exports map with `types` + `default` conditions, and no CJS build or bundler. The dual-package hazard can't happen.
2. **No top-level await anywhere in published code.** Enforce it in our own lint config (`no-restricted-syntax` or an equivalent rule), plus a CI test that `require()`s every subpath.
3. **Supported consumer TS settings:** `module` `nodenext`, `node20`, or `preserve`/`bundler`. Document that CJS projects on `module: node16` must move to `node20`/`nodenext`, and that `node10` is unsupported (TypeScript 7 removed it). `@qa-cortex/tsconfig` uses `nodenext`.
4. **Publish checks in CI:** `publint` and `attw --pack --profile esm-only` against the packed tarball.
5. **Consumer smoke tests in CI:** keep the `pw-cjs` and `pw-esm` consumer pattern under `examples/`, run on Playwright 1.60.0 and latest.

## Open items
- **Node floor not verified locally.** Only Node 26 is installed. `require(esm)` without warnings on Node 22.12 / 24.x must be proven in the CI matrix (`22.12.0`, `24.x`, `26.x`) before the first release.
- **npm scope.** The names `@qa-cortex/core`, `/tsconfig` and `/eslint-config` are free, but no `qa-cortex` org exists on npm yet. Someone has to create it to reserve the scope.
