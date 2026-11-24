// Playwright's own config stays in charge. QA Cortex only supplies validated values and checks.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { loadConfig, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { assertProductionSafe } from '@qa-cortex/core/guard';
import type { LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { qaPreset, selectPreset } from '@qa-cortex/core/presets';
import { loadSecrets } from '@qa-cortex/core/secrets';
import { qaConfig, type schema } from './qa.config.js';
import { secretsDef } from './qa.secrets.js';

// Local secrets: values from .env (gitignored; copy .env.example), read with Node's built-in
// loader. Variables already set in the shell or in CI win over the file.
const envFile = join(import.meta.dirname, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

// Validated here, in the main process: an invalid config, unknown profile or missing secret
// stops the run before any browser or worker starts. Tests get both through fixtures
// (tests/fixtures.ts), loaded once per worker for the same profile.
const qa = loadConfig(qaConfig);
loadSecrets(secretsDef, { profile: qa.profile });

// Reporter and artifact preset: "production" for a production profile, else "ci" when CI is
// set, else "local"; QA_CORTEX_PRESET=local|ci|production chooses one by hand (never weaker
// than production). Pass overrides as the second argument, e.g. { artifacts: { video: 'off' } }.
const preset = qaPreset(selectPreset({ production: qa.production }));

// This file is evaluated in the main process and again in every worker; log once.
if (!process.env.TEST_WORKER_INDEX) {
  console.log(`[qa-cortex] profile=${qa.profile} baseURL=${qa.baseURL} production=${String(qa.production)} preset=${preset.name}`);
}

// The intentional-failure demo (tests/failure/) runs ONLY when QAC_DEMO_FAILURE is set,
// via `npm run demo:logging-failure`. Every other run ignores that folder.
const failureDemo = !!process.env.QAC_DEMO_FAILURE;
const ci = !!process.env.CI;

// Browser projects. `npm test` runs Chromium only (--project=chromium); `npm run test:all` runs
// all three. Every project uses the same environment profile, fixtures and preset.
const browsers = [
  { name: 'chromium', device: devices['Desktop Chrome'] },
  { name: 'firefox', device: devices['Desktop Firefox'] },
  { name: 'webkit', device: devices['Desktop Safari'] },
];

const config = defineConfig<object, ConfigWorkerFixtures<typeof schema> & LoggerWorkerFixtures>({
  testDir: 'tests',
  // Native Playwright reporters chosen by the preset (local: list + HTML report; ci: dot or
  // github + HTML + JUnit in reports/; production: list + JUnit, no HTML report).
  reporter: preset.reporter,
  forbidOnly: ci,
  // Execution defaults (native Playwright; every one can be overridden on the command line):
  fullyParallel: true, // tests are independent (fresh page each), so even tests in one file run in parallel
  workers: ci ? 2 : undefined, // CI: 2, conservative for shared runners; locally Playwright's default (half the CPU cores). --workers=N
  retries: ci ? 2 : 0, // --retries=N
  timeout: 30_000, // per test, including its fixtures and hooks. --timeout=N
  expect: { timeout: 5_000 }, // per web-first assertion; no CLI flag: pass { timeout } to one assertion
  use: {
    ...preset.use, // trace, video and screenshot for the preset (production: all off)
    baseURL: qa.baseURL, // QA Cortex value mapped explicitly into Playwright's own option
    qaLogLevel: 'debug', // show every level in this demo (default is 'info')
  },
  projects: failureDemo
    ? [
        {
          name: 'failure-demo',
          testDir: 'tests/failure',
          use: { ...devices['Desktop Chrome'], qaLogAttach: 'on-failure' }, // attach only failed tests' logs
        },
      ]
    : browsers.map(({ name, device }) => ({
        name,
        testIgnore: '**/failure/**',
        use: { ...device, qaLogAttach: 'always' as const }, // attach every test's log
      })),
});

// Production guard, static part: throws if a production run would record traces, videos or
// screenshots. It only checks; it never changes the config. CLI flags such as --trace on are
// caught at run time by the qaProductionGuard fixture (tests/fixtures.ts).
assertProductionSafe(config, { production: qa.production });

export default config;
