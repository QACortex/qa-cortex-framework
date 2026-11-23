// Nested project: the documented pattern (ADR 0006) for keeping Playwright's `baseURL` and
// the `qaConfig` fixture on the same profile. Each project derives its baseURL from the very
// profile its qaConfig will load. Reuses the definition and `test` from ../pw-fixtures.
//
// QAC_ALIGN_NEGATIVE=1 adds a deliberately misaligned project, to prove the check detects drift.
import { defineConfig } from '@playwright/test';
import { loadConfig, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { qaConfig, type schema } from '../pw-fixtures/qa.config.js';

const fromEnv = loadConfig(qaConfig); // QA_CORTEX_PROFILE, else "local": same rule the fixture uses
const staging = loadConfig(qaConfig, { profile: 'staging' });

export default defineConfig<object, ConfigWorkerFixtures<typeof schema>>({
  testDir: '.',
  outputDir: process.env.QAC_NESTED_OUTPUT ?? 'test-results',
  workers: 2,
  reporter: [['list']],
  projects: [
    { name: 'env-profile', use: { baseURL: fromEnv.baseURL } },
    { name: 'staging', use: { qaProfile: 'staging', baseURL: staging.baseURL } },
    ...(process.env.QAC_ALIGN_NEGATIVE
      ? [{ name: 'misaligned', use: { qaProfile: 'staging', baseURL: loadConfig(qaConfig, { profile: 'local' }).baseURL } }]
      : []),
  ],
});
