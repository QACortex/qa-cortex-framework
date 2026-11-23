// Nested project for configFixtures(). It deliberately does NOT call loadConfig(), so the
// test-only load counter only sees loads made by the qaConfig fixture.
import { defineConfig } from '@playwright/test';
import type { ConfigWorkerFixtures } from '@qa-cortex/core/config';
import type { schema } from './qa.config.js';

export default defineConfig<object, ConfigWorkerFixtures<typeof schema>>({
  testDir: '.',
  outputDir: process.env.QAC_NESTED_OUTPUT ?? 'test-results',
  fullyParallel: true,
  workers: 2,
  reporter: [['list']],
  projects: [
    { name: 'env-profile' }, // qaProfile unset: QA_CORTEX_PROFILE, else "local"
    { name: 'staging', use: { qaProfile: 'staging' } },
  ],
});
