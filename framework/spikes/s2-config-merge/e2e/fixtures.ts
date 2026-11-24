import { test as base } from '@playwright/test';
import { configOption } from '../src/config/index.js';
import type { AppConfig } from './qa.config.js';

// Option-fixture pattern: value comes from playwright.config.ts `use`, per project.
export const test = base.extend<{}, { qaConfig: AppConfig }>(configOption<AppConfig>());
export { expect } from '@playwright/test';
