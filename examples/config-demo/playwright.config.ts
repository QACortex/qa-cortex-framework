// Playwright's own config stays in charge. QA Cortex only supplies validated values.
import { defineConfig, devices } from '@playwright/test';
import { loadConfig, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { qaConfig, type schema } from './qa.config.js';

// Validated here, in the main process: an invalid config or unknown profile stops the run
// before any browser or worker starts. Tests get the config from the `qaConfig` fixture
// (tests/fixtures.ts), which loads it once per worker for the same profile.
const qa = loadConfig(qaConfig);

// This file is evaluated in the main process and again in every worker; log once.
if (!process.env.TEST_WORKER_INDEX) {
  console.log(`[qa-cortex] profile=${qa.profile} baseURL=${qa.baseURL}`);
}

export default defineConfig<object, ConfigWorkerFixtures<typeof schema>>({
  testDir: 'tests',
  reporter: [['list']],
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: qa.baseURL, // QA Cortex value mapped explicitly into Playwright's own option
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
