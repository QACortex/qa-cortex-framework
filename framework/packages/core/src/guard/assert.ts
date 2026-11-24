import { checkProductionSafety, formatViolation } from './check.js';
import { ProductionGuardError } from './errors.js';
import type { AssertProductionSafeOptions, GuardedConfig } from './types.js';

/**
 * Static guard for playwright.config.ts. Throws ProductionGuardError listing every unsafe
 * setting when `production` is true; passes warnings (HTML/blob reporters) to `options.warn`.
 * It only checks: the config is never changed, and nothing is returned.
 *
 * ```ts
 * const config = defineConfig({ ... });
 * assertProductionSafe(config, { production: qa.production });
 * export default config;
 * ```
 */
export function assertProductionSafe(config: GuardedConfig, options: AssertProductionSafeOptions): void {
  const violations = checkProductionSafety(config, options);
  const warn = options.warn ?? defaultWarn;
  for (const v of violations.filter((x) => x.severity === 'warning')) warn(`QA Cortex production guard: ${formatViolation(v)}`);
  const errors = violations.filter((x) => x.severity === 'error');
  if (errors.length > 0) throw new ProductionGuardError(errors);
}

/** console.warn, but only in the main process: Playwright also loads the config in every worker. */
function defaultWarn(message: string): void {
  if (process.env.TEST_WORKER_INDEX === undefined) console.warn(message);
}
