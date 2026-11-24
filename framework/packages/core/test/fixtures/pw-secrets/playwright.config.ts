// Nested project for secretsFixtures(): two profiles, traces on and the log attached for every
// test, so the outer test can search every artifact for secret values.
import { defineConfig } from '@playwright/test';
import type { ConfigWorkerFixtures } from '@qa-cortex/core/config';
import type { LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import type { schema } from '../pw-fixtures/qa.config.js';

const outputDir = process.env.QAC_NESTED_OUTPUT ?? 'test-results';

export default defineConfig<object, ConfigWorkerFixtures<typeof schema> & LoggerWorkerFixtures>({
  testDir: '.',
  outputDir,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: process.env.QAC_JSON_REPORT ?? `${outputDir}/results.json` }]],
  use: { qaLogAttach: 'always', trace: 'on' },
  projects: [
    { name: 'local', use: { qaProfile: 'local' } },
    { name: 'staging', use: { qaProfile: 'staging' } },
  ],
});
