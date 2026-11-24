// @qa-cortex/core/guard: the Production guard (ADR 0003, ADR 0008).
//
// For a production run it CHECKS, and never changes, the Playwright settings that record
// artifacts able to contain secrets: trace, video, screenshot, and HTML/blob reporters.
//   - assertProductionSafe(): static, in playwright.config.ts (root and every project)
//   - productionGuardFixtures(): runtime, sees CLI flags and test.use() too
// This module never imports the config, logger or secrets modules, or any API/AI code.

export { checkProductionSafety } from './check.js';
export { assertProductionSafe } from './assert.js';
export { ProductionGuardError } from './errors.js';
export {
  productionGuardFixtures,
  type ProductionGuardDependencies,
  type ProductionGuardFixtures,
  type ProductionGuardWorkerFixtures,
} from './fixtures.js';
export type {
  AssertProductionSafeOptions,
  GuardOptions,
  GuardViolation,
  GuardedConfig,
  GuardedSetting,
  GuardedUse,
  RuntimeGuardOptions,
} from './types.js';
