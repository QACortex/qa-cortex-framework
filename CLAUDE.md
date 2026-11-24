# Project: QA Cortex framework

Thin, composition-first extension layer over Playwright (TypeScript).
Not a framework with its own runtime.

## Rules
- @playwright/test is a PEER dependency. Never bundle it.
- Do NOT wrap click, fill, expect or other Playwright actions.
- Do NOT import Playwright internals or private APIs.
- No BasePage class. Page objects belong to the user's project.
- No custom runner, retry engine, reporter UI or runtime plugin loader.
- Every module must work without the others.
- Raw Playwright must always remain usable.

## Phase 1 modules (build one at a time)
1. Config core: typed schema, environment profiles, validated at startup
2. Secrets loader and Production guard
3. Sessions/roles (must serve browser AND API: storageState + headers/tokens)
4. Cleanup registry (backend-agnostic teardown fixture)
5. Redacting logger (writes to testInfo)
6. Reporter and artifact presets
7. Shared lint config and tsconfig

## Seams to keep open for Phase 2 and 3
- Config schema reserves namespaced sections (api, ai)
- Core never imports API or AI code (separate packages later)

## Repository layout
- One GitHub repository, two independent npm projects (own package.json and lockfile each):
  - `framework/`: framework development and npm packaging (`packages/*` workspaces,
    tests, compat checks, ADRs in `framework/docs/adr/`, spikes).
  - `automation/`: ready-to-use automation project that consumes the packed
    `@qa-cortex/core` tarball until the package is published.
- The repository root holds only repo-level files (`.github/`, LICENSE, README, git config).
- New framework packages go in `framework/packages/` (e.g. api, ai later).

## Commands (run inside `framework/`)
- Install: npm ci
- Build: npm run build
- Test: npm test
- Lint: npm run lint

## Working agreement
- Plan first, then implement one module per session.
- Add tests and docs with every module.
- Check Playwright release notes before using any API newer than 1.60.