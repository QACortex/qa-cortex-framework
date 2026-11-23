# ADR 0000 — S0 toolchain: TypeScript 7 build, TypeScript 6 API for lint

- Status: accepted (spike S0, 2026-11-23)
- Spike code: `spikes/s0-toolchain/` (throwaway)
- Versions tested: Node 26.13.1, TypeScript 7.0.2, `@typescript/typescript6` 6.0.2 (resolves TS 6.0.3), ESLint 9.39.5, typescript-eslint 8.73.0, `@playwright/test` 1.65.1

## Question
1. Does TypeScript 7 emit correct JS, `.d.ts` and declaration maps with `tsc -b` across workspace packages?
2. Does typescript-eslint (type-aware rules) work with TypeScript 7?

## Findings

**Build: works.** Two workspace packages (`a` exports a subpath, `b` imports it through the workspace symlink) built with `tsc -b`, `module`/`moduleResolution: nodenext`, `composite`, `declaration`, `declarationMap`.
- Declarations were correct, including inferred return types, generics and classes.
- The second `tsc -b` reported both projects up to date, so incremental builds work.
- The built ESM ran in Node, and the output was frozen as expected.
- TS 6 (`tsc6 -b`) built the same projects with no errors.

**Lint: TypeScript 7 alone fails.** typescript-eslint 8.73 declares peer `typescript >=4.8.4 <6.1.0`. Forcing it onto TS 7 exits with "typescript-eslint does not support TS 7.0". TS 7.0 ships no programmatic API; a new one is due in 7.1.

**Lint: side-by-side works.** This is Microsoft's documented setup in the TS 7.0 release post:
```json
"devDependencies": {
  "@typescript/native": "npm:typescript@7.0.2",
  "typescript": "npm:@typescript/typescript6@6.0.2"
}
```
- `npx tsc` runs 7.0.2.
- `require('typescript')` resolves to 6.0.3.
- A `tsc6` binary is also available.
- Type-aware lint ran correctly: `no-floating-promises` and `consistent-type-imports` both flagged the probe file.

**TS 7 default changes that affect us:**
- `types` now defaults to `[]`. A Playwright spec that uses `process.env` failed with TS2591 until `"types": ["node"]` was set. So `@qa-cortex/tsconfig` must set `types: ["node"]`, and consumers need `@types/node`.
- `rootDir` now defaults to `./`. Every package tsconfig sets `rootDir: "src"` explicitly.

**Declaration maps point at `../src/*.ts`.** They only help consumers if `src` ships in the tarball.

## Decision
- **Build:** TypeScript 7 `tsc -b`, no bundler. Root devDependencies use the side-by-side aliases above.
- **Lint:** typescript-eslint on the TS 6 API through the `typescript` alias. Revisit when typescript-eslint supports TS ≥7.1 (typescript-eslint issue #10940).
- **CI:** `npm run build` (TS 7) is the source of truth for type errors. Lint only reports lint findings.
- **`@qa-cortex/tsconfig` preset:**
  - `module`/`moduleResolution: nodenext`
  - `types: ["node"]`
  - `strict`, `verbatimModuleSyntax`, `isolatedModules`
  - explicit `rootDir`/`outDir` in each package
- **Publishing:** ship `src/` alongside `dist/` so declaration maps resolve to source for go-to-definition. Exclude `*.tsbuildinfo` from the tarball through the `files` whitelist and add it to `.gitignore`.
- **`@qa-cortex/eslint-config`:** document that consumers on TS 7 need the same alias. The package's peer range stays typescript-eslint's own range, so we don't widen it ourselves.

## Follow-ups for later spikes
- S1: `@arethetypeswrong/cli` and `publint` must run in this dual-TS setup. Check which `typescript` attw loads.
- S2: an inferred type like `Readonly<T & DeepPartial<T> & {...}>` from a spread overlay shows up unreadably in hovers. The config API needs explicit, named result types.
