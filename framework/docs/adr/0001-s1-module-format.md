# ADR 0001 — S1 module format: ship ESM-only

- Status: accepted (spike S1, 2026-11-23). Amended by the three dated addenda at the end (Step 3 review, Step 3B validation, Step 7B CI results). The Node 22/24 runtime checks passed in CI. Node 22.12.0 prints the `require(esm)` ExperimentalWarning, and the probes still pass. CI pins Linux to Ubuntu 24.04 (see "Operating system limitation").
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

## Addendum: compatibility review (2026-11-23)
This section records the Step 3 review. ESM-only is **retained**.

### Corrections to the results above
- **Compiler.** The type matrix was re-run with **TypeScript 6.0.3** (ADR 0005) and gave identical results for `node16`, `node20`, `nodenext` and `bundler`. In TS 6, `node10` is deprecated (TS5107) rather than removed, and still can't resolve subpaths.
- **Our own type files were never checked.** Every consumer tsconfig had `skipLibCheck: true`. The matrix proves resolution and usage, not that our `.d.ts` files compile under each setting.
- **The Playwright 1.60 consumers were only run, never type-checked.**
- **Every run was on Node 26.13.1, on Windows.**

### Node minimum and why
- **Minimum: Node `>=22.12`.**
- **Why:** Node 20 is end-of-life. Playwright's docs list "latest 22.x, 24.x or 26.x". `require(esm)` is unflagged from 22.12.0.
- **Source:** official docs, not runs.
  - `require(esm)` has been unflagged since 22.12.0.
  - Its default ExperimentalWarning was removed in **22.13.0** and 23.5.0. So 22.12.0 probably prints a one-time warning in CJS projects, which is cosmetic.
  - It is no longer experimental from 25.4.0. Node 24 includes the 23.5 change, so no warning there.
- Playwright's own `engines` field (`>=20` in 1.65, `>=18` in 1.60) is wider than its documented support. We follow the docs.
- `engines` only produces a warning from npm; it doesn't enforce anything. Raise the minimum to `>=22.13` only if the CI matrix shows the 22.12.0 warning matters.

### Additional decisions
1. **Use `default`, never `import`, as the runtime condition in `exports`.** `require()` of ESM matches `require`/`default`, so an `import`-only map breaks CJS users. Use no `main`, `module`, top-level `types` or `typesVersions`.
2. **Add subpaths only as modules ship;** don't reserve future ones.
3. **Core only ever does `import type` from `@playwright/test`.** Fixtures and the `playwright` object are passed in by the user. This makes a second Playwright copy impossible (Playwright throws when loaded twice), and CI checks `dist` for runtime imports.
4. **Minimum TypeScript for consumers:**
   - CJS projects need TS **≥5.8**, because `nodenext` only accepts `require()` of ESM from 5.8, and `node20` arrives in 5.9.
   - ESM projects: any supported 5.x.
   - These floors come from TypeScript release notes, not runs; CI must confirm them.
5. **Package manifest for `@qa-cortex/core`:**
   - `"type": "module"`
   - `exports` with `types` + `default` per subpath, plus `./package.json`
   - `files: ["dist", "src"]`
   - `sideEffects: false`
   - `engines.node >=22.12`
   - `peerDependencies: { "@playwright/test": ">=1.60.0 <2" }`
   - `dependencies: { "zod": "^4.6.7" }`
   - `publishConfig: { access: "public", provenance: true }`

### Required tests (foundation CI, before the first release)
1. **Node versions:** CJS and ESM consumer smoke tests on Node 22.12.0, latest 22, latest 24 and 26. Record whether 22.12.0 prints the warning.
2. **Playwright versions:** type-check consumers on Playwright 1.60.0 and latest with `skipLibCheck: false`.
3. **TypeScript floor:** a CJS + `nodenext` consumer on TS 5.8 and 5.9.
4. **Platforms:** Linux and Windows runners.
5. **Publish checks:** `publint` and `attw --pack --profile esm-only` on the real tarball.
6. **Guards:**
   - `require()` of every subpath (catches top-level await)
   - no runtime `@playwright/test` import in `dist`
7. **Optional:** a scheduled run against Playwright `@next`.

### Known risks
- **Our type files depend on Playwright's types.** A type change in any minor release can break compiles while the code still runs. Keep Playwright type imports minimal, and prefer `Pick<>`-style structural types.
- **The peer range covers more than we test.** Playwright 1.61–1.64 are assumed to work.
- **Playwright 2.** The `<2` cap gives install warnings or `ERESOLVE` until we release.

## Addendum: compatibility validation (2026-11-23)
This section records the Step 3B runs. **No change to the decision or to the package manifest.**

**Scope.** Every result in this addendum applies to the **S1 stub package** (`@qa-cortex/core@0.0.0-spike.1`):
- two subpaths, `./config` and `./logger`
- a single type-only Playwright import (`TestInfo`)

These results show the package *format* works. They don't prove that the real `@qa-cortex/core` modules will compile against every supported Playwright version. The real package must pass the same checks in CI, because its type files will reference more Playwright types.

### Setup
- **Package:** the S1 stub was rebuilt with **TypeScript 6.0.3** in a temp folder and packed (11 files, 2.0 kB). The spike source was not modified.
- **Consumers:** four temp projects installed the tarball: CommonJS and ESM, each on Playwright **1.60.0** and **1.65.1**.
- **TypeScript:** each project had TS **5.8.3, 5.9.3 and 6.0.3** installed locally; **5.7.3** was added as a control.
- **Type checks:** every check used **`skipLibCheck: false`**.
- **Platform:** Node 26.13.1, Windows 11.

### Verified
- **Runtime:**
  - All four projects pass their Playwright tests, with no warnings.
  - From a CJS file: `require()` and `import()` give the same instance and shared state.
  - From an ES module: `import` and `createRequire` do the same.
  - `require.resolve` and `import.meta.resolve` point into `dist/`, and `./package.json` is readable.
  - The package root, deep `dist/` paths and unknown subpaths are blocked with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
  - `process.features.require_module` is `true`.
- **Types (identical on Playwright 1.60.0 and 1.65.1):**
  | TypeScript | Format | `nodenext` | `node20` | `node16` | `bundler` |
  |---|---|---|---|---|---|
  | 5.7.3 | CJS | ❌ TS1479 | — | — | ✅ |
  | 5.7.3 | ESM | ✅ | — | — | — |
  | 5.8.3 | CJS / ESM | ✅ / ✅ | ❌ TS6046 (unknown option) / ❌ | ❌ TS1479 / ✅ | ✅ / ✅ |
  | 5.9.3 | CJS / ESM | ✅ / ✅ | ✅ / ✅ | ❌ TS1479 / ✅ | ✅ / ✅ |
  | 6.0.3 | CJS / ESM | ✅ / ✅ | ✅ / ✅ | ❌ TS1479 / ✅ | ✅ / ✅ |

  **No error anywhere came from our type files or from Playwright's.** Every failure is a consumer setting.
- **Type resolution:**
  - Both subpaths resolve to `dist/*/index.d.ts` under `nodenext` and `bundler`.
  - Our type files bind to the *consumer's* Playwright. TypeScript's package ID shows `+@playwright/test@1.60.0` or `1.65.1`, so the peer dependency works.
  - Declaration maps point at the shipped `src/`.
- **Publish checks:**
  - `publint` 0.3.25 is clean.
  - `attw` 0.18.5 passes with `--profile esm-only`. Its default profile still flags `node10` and "node16 from CJS". That's because attw checks with its bundled TS 5.6, which predates `require()` of ESM; the TS ≥5.8 rows above show real CJS consumers type-check.
  - The emitted `dist/*.js` contains no reference to `@playwright/test`.

### Updates to the decisions above
- **Item 4 (consumer TypeScript minimum) is now verified, not just taken from release notes:**
  - CJS + `nodenext` needs **TS ≥5.8**: 5.7 fails with TS1479, and 5.8 passes.
  - `module: node20` needs **TS ≥5.9**: 5.8 rejects it with TS6046.
  - CJS projects using `bundler` work even on 5.7.
  - ESM projects work on 5.7 and later.
- **Required test 2** (`skipLibCheck: false` on Playwright 1.60 and latest) **passes for the stub.** It stays required in CI, because the stub imports only `TestInfo` and the real modules will use more Playwright types.
- **Required test 3** (TS 5.8 and 5.9) **passes.** Keep it in CI to catch regressions.

### Pending CI verification
- **Node.js 22 and 24 runtime compatibility: pending CI verification.**
  - Node 22.12.0, latest 22.x and latest 24.x have not been run, because they aren't installed locally.
  - Official Node docs say `require(esm)` works on all three, with a probable one-time ExperimentalWarning on 22.12.0 only. Treat that as expected, not verified.
  - Required test 1 (CJS and ESM consumer smoke tests on Node 22.12.0, latest 22, latest 24 and 26) must pass in CI before the first release. Its result decides whether the minimum stays `>=22.12` or moves to `>=22.13`.
- **Linux and macOS:** pending CI (required test 4).
- **Playwright 1.61–1.64:** untested. They're inside the peer range and assumed to work.

### Tooling note
A globally installed TypeScript can be picked up by `npx tsc` in a folder without a local install; it happened once during these runs. Project scripts must call the workspace's local `tsc`.

## Addendum: CI compatibility results (Step 7B, recorded 2026-11-24)
This section records the first run of the Compatibility workflow (`.github/workflows/compatibility.yml`,
added in commit `df7fe29`). **No change to the decision or to the package manifest.**

**Scope.** Unlike the earlier addenda, these results are for the **real `@qa-cortex/core`**
(config and logger modules, `0.0.0`), not the S1 stub. The tarball was packed once in CI and
installed into isolated consumer projects outside the repository, with no workspace links.

### What ran
- **Package job** (Ubuntu, Node 22): `pack:check`, `publint --strict` and
  `attw --pack --profile esm-only` on the packed tarball.
- **Consumer matrix**, 12 jobs: `ubuntu-latest` and `windows-latest` × Node `22.12.0`, `24` and
  `26` × Playwright `1.60.0` and `1.65.1`. Each job ran a CommonJS and an ESM consumer:
  - `probe.cjs` (`require()`) and `probe.mjs` (`import`) of every subpath
  - a consumer type-check against that Playwright version
  - the config and logger fixture tests
  - a Chromium smoke test against a local server (no external websites)

### Result
The run passed: the package job and all 12 consumer jobs (24 consumer runs) were green.

### Node 22.12.0 prints the `require(esm)` warning
The `probe.cjs` rows of the Node 22.12.0 jobs show that Node 22.12.0 **emits the one-time
`require(esm)` ExperimentalWarning** when a CommonJS consumer `require()`s the package. This was
expected from the Node docs, which say the warning was removed in 22.13.0.

The compatibility probes **still pass** on 22.12.0. The warning is cosmetic: it does not change
behaviour, and the probes record it without treating it as a failure.

- **Decision:** the minimum stays `>=22.12`.
- QA Cortex does not suppress the warning. Users who want to avoid it can run Node ≥22.13.

### Operating system limitation (Step 8 PR run)
- **What failed:** on the Step 8 pull request, the three `ubuntu-latest` × Playwright **1.60.0**
  consumer jobs (Node 22.12.0, 24 and 26) failed. The other 9 consumer jobs, the package job and
  CI passed.
- **Cause:** GitHub's `ubuntu-latest` label moved to **Ubuntu 26.04**. Playwright 1.60.0 has no
  `chromium-headless-shell` build for `ubuntu26.04-x64`, so the browser install fails before any
  test runs. This is not a QA Cortex failure. Playwright 1.65.1 supports Ubuntu 26.04.
- **Fix:** the Compatibility workflow pins the Linux consumer runner to **`ubuntu-24.04`** and
  keeps every Node × Playwright combination.
- **What this means for users:**
  - Playwright 1.60.0 (our peer floor) is verified on Ubuntu 24.04 and Windows.
  - Projects on Ubuntu 26.04 need a Playwright version that supports it.
  - The peer floor is unchanged.
- **Revisit:** if GitHub retires `ubuntu-24.04` runners, or if the peer floor is raised.

### Updates to the open items and required tests above
- **Node floor `>=22.12`: verified.** `require()` of ESM works on Node 22.12.0, 24 and 26, in
  CommonJS and ESM consumers. This closes the "Node floor not verified locally" item and the
  "Node.js 22 and 24 runtime compatibility" pending item.
- **Platforms:** Linux (Ubuntu 24.04) and Windows verified (required test 4). **macOS is still
  untested.**
- **Playwright types:** the real package type-checks against Playwright 1.60.0 and 1.65.1
  (required test 2), which the stub-only results above could not show.
- **Publish checks** on the real tarball pass (required test 5).
- **Required test 1** (CJS and ESM smoke tests on Node 22.12.0, 24 and 26) passes.

### Still open
- **Ubuntu 26.04 with Playwright 1.60.0** is unsupported upstream, and CI does not cover it.
- **TypeScript 5.8 / 5.9 consumers** (required test 3) are not in the CI matrix; the evidence is
  still the local Step 3B run on the stub.
- **Node "latest 22.x"** is not a separate matrix entry; only 22.12.0 is.
- **Playwright 1.61–1.64** remain untested (inside the peer range, assumed to work).
- **npm scope:** the `qa-cortex` npm org still has to be created before publishing.
- Paths in this ADR that predate Step 8 (`examples/`, `spikes/`, `compat/`) are relative to
  the old repository root; the framework now lives under `framework/`.
