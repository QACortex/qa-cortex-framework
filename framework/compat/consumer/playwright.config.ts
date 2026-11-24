// Consumer playwright.config.ts: loadConfig() at the top, baseURL mapped explicitly, logger
// options set through `use`. In the CommonJS variant Playwright compiles this file to
// CommonJS, so the import below is a require() of the ESM package.
import { defineConfig, devices } from '@playwright/test';
import { loadConfig, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import type { LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { qaConfig, type schema } from './qa.config.js';

const qa = loadConfig(qaConfig);

export default defineConfig<object, ConfigWorkerFixtures<typeof schema> & LoggerWorkerFixtures>({
  testDir: 'tests',
  reporter: [['list']],
  retries: 0,
  forbidOnly: !!process.env.CI,
  use: { baseURL: qa.baseURL, qaLogAttach: 'always' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'node server.mjs', url: qa.baseURL, reuseExistingServer: false, timeout: 30_000 },
});
