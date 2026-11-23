// Hands the loaded config to tests through a plain Playwright option fixture.
// No QA Cortex fixture helper is needed.
import { test as base } from '@playwright/test';
import { loadConfig } from '@qa-cortex/core/config';
import { qaConfig, type DemoConfig } from '../qa.config.js';

export const test = base.extend<object, { qa: DemoConfig }>({
  // Default: load from the environment. playwright.config.ts sets it via `use: { qa }`.
  qa: [loadConfig(qaConfig), { option: true, scope: 'worker' }],
});

export { expect } from '@playwright/test';
