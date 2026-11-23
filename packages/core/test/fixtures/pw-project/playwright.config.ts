// A user's playwright.config.ts: Playwright's own defineConfig stays in charge; QA Cortex
// only supplies validated values. The config is loaded (and validated) at the top, so a bad
// profile fails in the main process before any worker starts.
import { defineConfig } from '@playwright/test';
import { loadConfig } from '@qa-cortex/core/config';
import { qaConfig, type AppConfig } from './qa.config.js';

const qa = loadConfig(qaConfig);
const staging = loadConfig(qaConfig, { profile: 'staging' });

export default defineConfig<object, { qaConfig: AppConfig }>({
  testDir: '.',
  outputDir: process.env.QAC_NESTED_OUTPUT ?? 'test-results',
  fullyParallel: true,
  workers: 2,
  reporter: [['list']],
  use: { baseURL: qa.baseURL, qaConfig: qa },
  projects: [
    { name: 'env-profile' },
    { name: 'staging', use: { baseURL: staging.baseURL, qaConfig: staging } },
  ],
});
