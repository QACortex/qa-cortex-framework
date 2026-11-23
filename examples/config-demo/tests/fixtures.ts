// The project's own `test`, extended with QA Cortex config fixtures:
//   qaConfig  - validated, frozen config, loaded once per worker
//   qaProfile - optional per-project profile (`use: { qaProfile: 'staging' }`)
import { test as base } from '@playwright/test';
import { configFixtures, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { qaConfig, type schema } from '../qa.config.js';

export const test = base.extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig));

export { expect } from '@playwright/test';
