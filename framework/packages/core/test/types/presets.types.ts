// Compile-only type tests for @qa-cortex/core/presets (TypeScript 6.0.3, `npm run typecheck`).
// One invalid case per statement (ADR 0005). Not executed.
import { defineConfig, devices } from '@playwright/test';
import { configFixtures, defineQaConfig, loadConfig, type ConfigWorkerFixtures, type CoreSchema } from '@qa-cortex/core/config';
import type { LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { artifactPresets, qaPreset, selectPreset, type PresetName, type QaPreset } from '@qa-cortex/core/presets';

const qa = loadConfig(defineQaConfig({ base: { baseURL: 'http://localhost:3000' }, profiles: { local: {} } }));
void configFixtures;

// ---------------------------------------------------------------- spreads into a real config
const name: PresetName = selectPreset({ production: qa.production });
const preset: QaPreset = qaPreset(name, {
  artifacts: { video: 'on-first-retry', trace: { mode: 'retain-on-failure', snapshots: true } },
  reporters: {
    html: { open: 'never', outputFolder: 'playwright-report' },
    junit: { outputFile: 'reports/junit.xml', includeProjectInTestName: true },
    json: true,
    extra: [['allure-playwright', { resultsDir: 'allure-results' }], { reporter: ['./my-reporter.ts'], allowInProduction: true }],
  },
});
export default defineConfig<object, ConfigWorkerFixtures<CoreSchema> & LoggerWorkerFixtures>({
  reporter: preset.reporter,
  use: { ...preset.use, baseURL: qa.baseURL, qaLogAttach: 'on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...artifactPresets.ci } }],
});

qaPreset('ci', { reporters: { replace: [['line'], ['junit', { outputFile: 'reports/junit.xml' }]] } });
qaPreset('local', { reporters: { html: false, junit: false, json: false } });

// @ts-expect-error unknown preset name
qaPreset('staging');
// @ts-expect-error not a trace mode
qaPreset('ci', { artifacts: { trace: 'sometimes' } });
// @ts-expect-error html takes HTML reporter options or false
qaPreset('ci', { reporters: { html: true } });
// @ts-expect-error production is required
selectPreset({});
// @ts-expect-error the artifact presets are read-only
artifactPresets.local.trace = 'on';
