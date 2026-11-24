// Runtime production guard (ADR 0008). A worker-scoped AUTO fixture: Playwright sets it up
// before the browser and any test-scoped fixture, so an unsafe production worker fails before
// a browser launches, a context is created or a video/screenshot is recorded.
//
// It reads Playwright's own option fixtures, so it sees the EFFECTIVE values after the config,
// the project, CLI flags (--trace on, --reporter) and test.use(). Playwright imported for types only.
import type { PlaywrightWorkerOptions, WorkerFixture } from '@playwright/test';
import { checkReporters, checkUse } from './check.js';
import { ProductionGuardError } from './errors.js';
import type { RuntimeGuardOptions } from './types.js';

export type ProductionGuardWorkerFixtures = {
  /** Auto fixture: fails the worker when a production run would record unsafe artifacts. */
  qaProductionGuard: void;
};

/** What the base test must provide: the config fixtures' `qaConfig` (any schema), plus Playwright's options. */
export type ProductionGuardDependencies = { qaConfig: { readonly production: boolean } } & Pick<PlaywrightWorkerOptions, 'trace' | 'video' | 'screenshot'>;

/** The object productionGuardFixtures() returns (spelled out so `qaConfig` is only a dependency). */
export type ProductionGuardFixtures = {
  qaProductionGuard: [WorkerFixture<void, ProductionGuardDependencies>, { scope: 'worker'; auto: true; box: boolean }];
};

/**
 * Runtime production guard for your own `test.extend()`; the base test must have configFixtures().
 * Errors only: reporter warnings are the static check's job (assertProductionSafe), unless
 * `reporters: 'error'` is set, which this fixture enforces too.
 */
export function productionGuardFixtures(options: RuntimeGuardOptions = {}): ProductionGuardFixtures {
  return {
    qaProductionGuard: [
      async ({ qaConfig, trace, video, screenshot }, use, workerInfo) => {
        if (qaConfig.production) {
          const violations = [
            ...checkUse({ trace, video, screenshot }, workerInfo.project.name || undefined, options),
            ...checkReporters(workerInfo.config.reporter, options),
          ].filter((v) => v.severity === 'error');
          if (violations.length > 0) throw new ProductionGuardError(violations);
        }
        await use();
      },
      { scope: 'worker', auto: true, box: true },
    ],
  };
}
