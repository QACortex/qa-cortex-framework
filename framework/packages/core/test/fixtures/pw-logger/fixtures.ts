// The user's own test: config fixtures and logger fixtures composed with plain test.extend(),
// plus the secrets override (from code, never from `use`).
import { test as base } from '@playwright/test';
import { configFixtures, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { loggerFixtures, type LoggerTestFixtures, type LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { qaConfig, type schema } from '../pw-fixtures/qa.config.js';

const withConfig = base.extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig));

export const test = withConfig.extend<LoggerTestFixtures, LoggerWorkerFixtures>({
  ...loggerFixtures(),
  qaSecrets: [
    async ({}, use) => {
      await use([process.env.QAC_TEST_SECRET ?? '']);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
