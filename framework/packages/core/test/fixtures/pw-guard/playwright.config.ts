// Nested project for the production guard. Driven by environment variables from the outer test:
//   QA_CORTEX_PROFILE        local | production
//   QAC_GUARD_STATIC=1       also run the static assertProductionSafe() on this config
//   QAC_GUARD_CONFIG_TRACE   root use.trace (default "off")
import { defineConfig } from '@playwright/test';
import { loadConfig } from '@qa-cortex/core/config';
import { assertProductionSafe } from '@qa-cortex/core/guard';
import { qaConfig } from './qa.config.js';

const qa = loadConfig(qaConfig);

const config = defineConfig({
  testDir: '.',
  outputDir: process.env.QAC_NESTED_OUTPUT ?? 'test-results',
  workers: 1,
  reporter: [['list']],
  use: { trace: (process.env.QAC_GUARD_CONFIG_TRACE ?? 'off') as 'off' | 'on', video: 'off', screenshot: 'off' },
});

if (process.env.QAC_GUARD_STATIC === '1') assertProductionSafe(config, { production: qa.production });

export default config;
