// Compile-only type tests for @qa-cortex/core/guard (TypeScript 6.0.3, `npm run typecheck`).
// One invalid case per statement (ADR 0005). Not executed.
import { test as base, defineConfig, devices } from '@playwright/test';
import { configFixtures, defineQaConfig, loadConfig, type ConfigWorkerFixtures, type CoreSchema } from '@qa-cortex/core/config';
import {
  assertProductionSafe,
  checkProductionSafety,
  productionGuardFixtures,
  type GuardViolation,
  type ProductionGuardWorkerFixtures,
} from '@qa-cortex/core/guard';

const qaConfig = defineQaConfig({ base: { baseURL: 'http://localhost:3000' }, profiles: { local: {}, production: { production: true } } });
const qa = loadConfig(qaConfig);

// ---------------------------------------------------------------- static check accepts real configs
const config = defineConfig<object, ConfigWorkerFixtures<CoreSchema>>({
  use: { baseURL: qa.baseURL, trace: { mode: 'off', snapshots: false }, video: 'off', screenshot: 'only-on-failure', qaProfile: 'production' },
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
assertProductionSafe(config, { production: qa.production, allowScreenshotsOnFailure: true, reporters: 'warn', warn: (m: string) => void m });
const violations: GuardViolation[] = checkProductionSafety(config, { production: true });
void violations;
// @ts-expect-error production is required
assertProductionSafe(config, {});
// @ts-expect-error unknown reporters policy
assertProductionSafe(config, { production: true, reporters: 'fail' });

// ---------------------------------------------------------------- runtime fixture
const test = base
  .extend<object, ConfigWorkerFixtures<CoreSchema>>(configFixtures(qaConfig))
  .extend<object, ProductionGuardWorkerFixtures>(productionGuardFixtures({ allowScreenshotsOnFailure: true }));
test('the guard is an auto fixture; tests need not request it', ({ qaConfig: loaded }) => {
  void loaded.production;
});

const spread = base.extend<object, ConfigWorkerFixtures<CoreSchema> & ProductionGuardWorkerFixtures>({
  ...configFixtures(qaConfig),
  ...productionGuardFixtures(),
});
void spread;

// @ts-expect-error productionGuardFixtures() needs qaConfig (configFixtures) in the base test
base.extend<object, ProductionGuardWorkerFixtures>(productionGuardFixtures());
// @ts-expect-error production comes from qaConfig, not from the options
productionGuardFixtures({ production: true });
