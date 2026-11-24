// Nested project for the presets: the preset chosen by selectPreset() (QA_CORTEX_PRESET, or
// QAC_PRODUCTION=1 for a production profile), checked by the guard. Copied to a temporary folder
// by the outer test, so the preset's default report paths are exercised as they are.
import { defineConfig } from '@playwright/test';
import { assertProductionSafe } from '@qa-cortex/core/guard';
import { qaPreset, selectPreset } from '@qa-cortex/core/presets';

const production = process.env.QAC_PRODUCTION === '1';
const preset = qaPreset(selectPreset({ production }));
if (!process.env.TEST_WORKER_INDEX) console.log(`QAC_PRESET name=${preset.name} reporters=${preset.reporter.map((r) => r[0]).join(',')}`);

const config = defineConfig({
  testDir: '.',
  outputDir: 'test-results',
  workers: 1,
  reporter: preset.reporter,
  use: preset.use,
});

assertProductionSafe(config, { production, reporters: 'error' });

export default config;
