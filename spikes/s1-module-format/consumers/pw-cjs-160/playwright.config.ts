import { defineConfig } from '@playwright/test';
import { loadConfig } from '@qa-cortex/core/config';

// Config core used from the main-process config file (the module 1 usage pattern).
const cfg = loadConfig();
export default defineConfig({
  testDir: 'tests',
  use: { baseURL: cfg.baseURL },
  metadata: { profile: cfg.profile },
});
