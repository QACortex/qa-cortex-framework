import { defineConfig } from '@playwright/test';
import { loadConfig } from '../src/config/index.js';
import { qaConfig, recordEvaluation, type AppConfig } from './qa.config.js';

recordEvaluation('playwright.config');

// Validated here, so a bad profile fails before any worker starts.
const main = loadConfig(qaConfig);
// Pinned per project, to probe option fixtures carrying a whole config.
const staging = loadConfig(qaConfig, { profile: 'staging' });

export default defineConfig<{}, { qaConfig: AppConfig }>({
  testDir: '.',
  fullyParallel: true,
  workers: 3,
  reporter: [['list']],
  use: { baseURL: main.baseURL },
  projects: [
    { name: 'env-profile', use: { qaConfig: main } },
    { name: 'staging', use: { qaConfig: staging, baseURL: staging.baseURL } },
  ],
});
