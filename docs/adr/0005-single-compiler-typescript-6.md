# ADR 0005 — Single compiler: TypeScript 6.0.3 for build, type-check and lint

- Status: accepted (2026-11-23). Supersedes the toolchain decision in [ADR 0000](0000-s0-toolchain.md).
- Versions verified: Node 26.13.1, `typescript` 6.0.3, ESLint 9.39.5, typescript-eslint 8.73.0, `@playwright/test` 1.65.1 (Windows 11)

## Context
ADR 0000 chose two compilers: TypeScript 7 for the build, and TypeScript 6 (aliased as `typescript`) so typescript-eslint could run. That was a choice, not a necessity. S0 had already shown TS 6 builds the same code. Two compilers means:
- npm aliases
- two `tsc` binaries
- contributors unsure which compiler produced an error

## Verification
Done without modifying any spike.

**Build:** S0 was rebuilt in a scratch copy with TypeScript 7 removed, using plain `typescript@6.0.3`.
- `tsc -b` across both workspace packages produced JS, `.d.ts` and declaration maps.
- A second build reported both projects up to date, so incremental builds work.
- The emitted declarations were identical to TS 7's.
- The built output ran correctly.

**Lint:** type-aware lint (ESLint 9.39.5, typescript-eslint 8.73.0) loaded TS 6.0.3 and reported the same 3 deliberate probe errors as in S0.

**Other spikes:** type-checked with TS 6.0.3, no emit.
| Spike | Result |
|---|---|
| S1 package | ✅ |
| S1 consumer matrix | identical to TS 7 for `node16`, `node20`, `nodenext`, `bundler`. `node10` is deprecated in TS 6 (TS5107) rather than removed, and still can't resolve subpaths (TS2307). ADR 0001's conclusion stands. |
| S4 | ✅ |
| S2 | ❌ type-test file only (see below) |

**No spike uses a TS 7-only feature** (`--builders`, `--checkers`, `isolatedDeclarations` and the like). The only ties to TS 7 were the `@typescript/native` alias behind `tsc` and the root `typescript ^7.0.2`.

## Findings
1. **Defaults ADR 0000 attributed to TS 7 also apply to TS 6.**
   - `types` defaults to `[]`: a Playwright spec using `process.env` fails with TS2591 unless `types: ["node"]` is set.
   - `strict` defaults to `true`.
   - The shared tsconfig sets both explicitly.
2. **Overloads and error location.** When one call to an *overloaded* function contains several type errors, TS 6 reports a single TS2769 at the call, while TS 7 reported each error separately.
   - S2's type tests put three `@ts-expect-error` probes in one `defineConfig` call, so they fail on TS 6.
   - With one error per call, TS 6 and TS 7 report the same error at the same position.
   - A single-signature `defineConfig` gives the clearer TS2561 ("did you mean 'tenant'?") on both.
   - **For module 1:** no overloads in the public config API, and one probe per call in type tests.
3. **Versions.**
   - **TypeScript:** 6.0.3 (2026-04-16) is the latest stable 6.x; no 6.1 exists. npm's `latest` tag points to 7.0.2, so the version must be pinned exactly.
   - **typescript-eslint:** 8.73.0 and 8.74.0 both declare peer `typescript >=4.8.4 <6.1.0`. Their manifests already list an optional `@typescript/native >=7.1` peer, so TS 7 support is on the way.

## Decision
- **One compiler:** `typescript` **6.0.3, exact pin** (`--save-exact`). It is used for `tsc -b`, editor type-checking and typescript-eslint. No `@typescript/native` alias, no `tsc6`.
- **ESLint 9.39.5 + typescript-eslint 8.73.0** (verified). Moving to ESLint 10 or typescript-eslint 8.74+ needs its own check.
- **The shared tsconfig sets explicitly:**
  - `types: ["node"]`
  - `strict: true`
  - `rootDir`/`outDir` per package
  - `module`/`moduleResolution: nodenext`
- **Spikes stay as they are.** They record the TS 7 experiment with their own lockfiles. Code ported from them, such as the S2 type tests, is adapted while porting.

## Revisit when
- typescript-eslint supports TypeScript ≥7.1, or
- TS 6.0.x stops receiving fixes.

Moving to TS 7 then means a version change and re-running this verification, not a design change.

## Not verified
- TypeScript 5.x consumers type-checking declarations emitted by TS 6.
- ESLint 10.
- Linux and macOS; all runs were on Windows with Node 26.
