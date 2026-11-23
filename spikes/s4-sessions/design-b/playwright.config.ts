// Design B: no setup project. A worker-scoped store logs in lazily, on first use, behind a lock.
import { defineConfig } from '@playwright/test';
import { BASE_URL } from '../src/app-roles.js';
import { OUT, webServer } from '../src/run-env.js';

export default defineConfig({
  testDir: '.',
  outputDir: `../${OUT}/test-results`,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: { baseURL: BASE_URL, trace: 'on' },
  webServer: { ...webServer, cwd: '..' },
});
