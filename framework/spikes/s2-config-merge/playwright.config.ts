import { defineConfig } from '@playwright/test';

// Unit tests only: no browser, no baseURL. The e2e worker probe has its own config in e2e/.
export default defineConfig({
  testDir: 'test',
  reporter: [['list']],
});
