// The consumer's own `test`: config and logger fixtures composed with test.extend().
import { test as base } from '@playwright/test';
import { configFixtures, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { loggerFixtures, type LoggerTestFixtures, type LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { qaConfig, type schema } from '../qa.config.js';

/** Synthetic value, not a credential. The driver checks it never reaches the console output. */
export const SECRET = process.env.QAC_COMPAT_SECRET ?? 'compat-synthetic-value';

export const test = base
  .extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig))
  .extend<LoggerTestFixtures, LoggerWorkerFixtures>({
    ...loggerFixtures(),
    qaSecrets: [
      async ({}, use) => {
        await use([SECRET]);
      },
      { scope: 'worker' },
    ],
  });

export { expect } from '@playwright/test';
