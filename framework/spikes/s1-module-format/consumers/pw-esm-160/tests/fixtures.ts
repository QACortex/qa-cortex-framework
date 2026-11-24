import { test as base } from '@playwright/test';
import { loadConfig, type LoadedConfig } from '@qa-cortex/core/config';

export const test = base.extend<{}, { cfg: LoadedConfig }>({
  cfg: [async ({}, use) => { await use(loadConfig()); }, { scope: 'worker' }],
});
export { expect } from '@playwright/test';
