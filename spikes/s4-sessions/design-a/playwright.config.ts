// Design A: a setup project logs every role in ONCE, untraced; e2e tests only read session files.
import { defineConfig } from '@playwright/test';
import { BASE_URL } from '../src/app-roles.js';
import { OUT, webServer } from '../src/run-env.js';

export default defineConfig({
  testDir: '.',
  outputDir: `../${OUT}/test-results`,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: { baseURL: BASE_URL },
  webServer: { ...webServer, cwd: '..' },
  projects: [
    // trace OFF: passwords pass through here (ADR 0003).
    { name: 'auth-setup', testMatch: /auth\.setup\.ts/, use: { trace: 'off' } },
    { name: 'e2e', testMatch: /.*\.spec\.ts/, dependencies: ['auth-setup'], use: { trace: 'on' } },
  ],
});
