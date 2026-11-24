// Playwright's own config stays in charge. QA Cortex only supplies validated values.
import { defineConfig, devices } from '@playwright/test';
import { loadConfig, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import type { LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { qaConfig, type schema } from './qa.config.js';

// Validated here, in the main process: an invalid config or unknown profile stops the run
// before any browser or worker starts. Tests get the config from the `qaConfig` fixture
// (tests/fixtures.ts), which loads it once per worker for the same profile.
const qa = loadConfig(qaConfig);

// This file is evaluated in the main process and again in every worker; log once.
if (!process.env.TEST_WORKER_INDEX) {
  console.log(`[qa-cortex] profile=${qa.profile} baseURL=${qa.baseURL}`);
}

// The intentional-failure demo (tests/failure/) runs ONLY when QAC_DEMO_FAILURE is set,
// via `npm run demo:logging-failure`. Every other run ignores that folder.
const failureDemo = !!process.env.QAC_DEMO_FAILURE;

export default defineConfig<object, ConfigWorkerFixtures<typeof schema> & LoggerWorkerFixtures>({
  testDir: 'tests',
  // Native reporters only: terminal list + Playwright's HTML report (`npm run report`).
  reporter: [['list'], ['html', { open: 'never' }]],
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: qa.baseURL, // QA Cortex value mapped explicitly into Playwright's own option
    trace: 'retain-on-failure',
    qaLogLevel: 'debug', // show every level in this demo (default is 'info')
  },
  projects: failureDemo
    ? [
        {
          name: 'failure-demo',
          testDir: 'tests/failure',
          use: { ...devices['Desktop Chrome'], qaLogAttach: 'on-failure' }, // attach only failed tests' logs
        },
      ]
    : [
        {
          name: 'chromium',
          testIgnore: '**/failure/**',
          use: { ...devices['Desktop Chrome'], qaLogAttach: 'always' }, // attach every test's log
        },
      ],
});
