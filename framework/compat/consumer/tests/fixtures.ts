// The consumer's own `test`: config, logger, secrets and production-guard fixtures composed
// with test.extend(). secretsFixtures() comes after loggerFixtures(), so it fills qaSecrets.
import { test as base } from '@playwright/test';
import { configFixtures, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { productionGuardFixtures, type ProductionGuardWorkerFixtures } from '@qa-cortex/core/guard';
import { loggerFixtures, type LoggerTestFixtures, type LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { secretsFixtures, type SecretsWorkerFixtures } from '@qa-cortex/core/secrets';
import { qaConfig, type schema } from '../qa.config.js';
import { secretsDef } from '../qa.secrets.js';

/** Synthetic value, not a credential. The driver checks it never reaches the console output. */
export const SECRET = process.env.QAC_COMPAT_SECRET ?? 'compat-synthetic-value';

export const test = base
  .extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig))
  .extend<LoggerTestFixtures, LoggerWorkerFixtures>(loggerFixtures())
  .extend<object, SecretsWorkerFixtures<(typeof secretsDef)['entries']>>(secretsFixtures(secretsDef))
  .extend<object, ProductionGuardWorkerFixtures>(productionGuardFixtures());

export { expect } from '@playwright/test';
