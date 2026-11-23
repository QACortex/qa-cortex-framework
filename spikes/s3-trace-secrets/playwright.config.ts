import { defineConfig } from '@playwright/test';

// S3_VARIANT selects the artifact settings under test:
//   baseline  - everything on (worst case)
//   lean      - trace without DOM/screen snapshots and sources (1.63 `snapshots` object)
const variant = process.env.S3_VARIANT ?? 'baseline';
const out = `out/${variant}`;

const trace =
  variant === 'lean'
    ? ({ mode: 'on', snapshots: { dom: false, screen: false, aria: false }, sources: false } as const)
    : ('on' as const);

export default defineConfig({
  testDir: 'tests',
  outputDir: `${out}/test-results`,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: `${out}/html-report`, open: 'never' }],
    ['blob', { outputDir: `${out}/blob-report` }],
    ['json', { outputFile: `${out}/results.json` }],
    ['junit', { outputFile: `${out}/junit.xml` }],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    trace,
    video: variant === 'lean' ? 'off' : 'on',
    screenshot: variant === 'lean' ? 'off' : 'on',
  },
  webServer: { command: 'node server.mjs', url: 'http://localhost:4173/login', reuseExistingServer: false },
});
