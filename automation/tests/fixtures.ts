// The project's own `test`, extended with QA Cortex fixtures:
//   config: qaConfig (validated, frozen, once per worker) and qaProfile (per-project option)
//   logger: qaLog (per test), qaLogLevel / qaLogAttach (options) and qaSecrets (redaction list)
import { randomUUID } from 'node:crypto';
import { test as base } from '@playwright/test';
import { configFixtures, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { loggerFixtures, type LoggerTestFixtures, type LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { qaConfig, type schema } from '../qa.config.js';

/**
 * SYNTHETIC secret for the logging demo: not a real credential. `scripts/logging-demo.mjs`
 * generates a fresh one per run. It is deliberately never written as a literal in source:
 * traces and the HTML report embed test source code, so a literal would appear there no
 * matter what the logger does.
 */
export const DEMO_SECRET = process.env.QAC_DEMO_SECRET ?? `demo-synthetic-${randomUUID()}`;

const withConfig = base.extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig));

export const test = withConfig.extend<LoggerTestFixtures, LoggerWorkerFixtures>({
  ...loggerFixtures(),
  // In a real project these values come from a vault or the environment, never from `use`.
  qaSecrets: [
    async ({}, use) => {
      await use([DEMO_SECRET]);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
