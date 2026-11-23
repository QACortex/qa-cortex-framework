import { defineConfig } from '@playwright/test';

// Repository test runner. Package tests live in packages/<name>/test and need no browser.
export default defineConfig({
  testDir: 'packages',
  testMatch: '*/test/**/*.spec.ts',
  reporter: [['list']],
  forbidOnly: !!process.env.CI,
});
