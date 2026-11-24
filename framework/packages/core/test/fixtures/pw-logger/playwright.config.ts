// Nested project for loggerFixtures(): three attachment policies, retries and traces on.
import { defineConfig } from '@playwright/test';
import type { LoggerWorkerFixtures } from '@qa-cortex/core/logger';

export default defineConfig<object, LoggerWorkerFixtures>({
  testDir: '.',
  outputDir: process.env.QAC_NESTED_OUTPUT ?? 'test-results',
  workers: 2,
  retries: 1,
  reporter: [['list'], ['json', { outputFile: process.env.QAC_JSON_REPORT ?? 'results.json' }]],
  use: { trace: 'on' },
  projects: [
    { name: 'default' }, // qaLogLevel "info", qaLogAttach "on-failure"
    { name: 'always', use: { qaLogLevel: 'debug', qaLogAttach: 'always' } },
    { name: 'off', use: { qaLogAttach: 'off' } },
  ],
});
