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

## Commands
- Build: npm run build
- Test: npx playwright test
- Lint: npm run lint

## Working agreement
- Plan first, then implement one module per session.
- Add tests and docs with every module.
- Check Playwright release notes before using any API newer than 1.60.