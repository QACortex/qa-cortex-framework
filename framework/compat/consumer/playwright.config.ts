// Consumer playwright.config.ts: loadConfig() at the top, baseURL mapped explicitly, logger
// options set through `use`, and the static production guard. In the CommonJS variant
// Playwright compiles this file to CommonJS, so the imports below are require() of the ESM package.
import { defineConfig, devices } from '@playwright/test';
import { loadConfig, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { assertProductionSafe } from '@qa-cortex/core/guard';
import type { LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { qaConfig, type schema } from './qa.config.js';

const qa = loadConfig(qaConfig);

const config = defineConfig<object, ConfigWorkerFixtures<typeof schema> & LoggerWorkerFixtures>({
  testDir: 'tests',
  reporter: [['list']],
  retries: 0,
  forbidOnly: !!process.env.CI,
  use: { baseURL: qa.baseURL, qaLogAttach: 'always' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'node server.mjs', url: qa.baseURL, reuseExistingServer: false, timeout: 30_000 },
});

// Static production guard: a no-op here (the local profile is not production), but it must
// load and type-check in every consumer format.
assertProductionSafe(config, { production: qa.production });

export default config;
