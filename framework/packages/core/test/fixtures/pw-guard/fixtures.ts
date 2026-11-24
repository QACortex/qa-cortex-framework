// The user's own test: config fixtures plus the runtime guard. QAC_GUARD_REPORTERS=error makes
// HTML/blob reporters an error at run time (to check that --reporter reaches the fixture).
import { test as base } from '@playwright/test';
import { configFixtures, type ConfigWorkerFixtures, type CoreSchema } from '@qa-cortex/core/config';
import { productionGuardFixtures, type ProductionGuardWorkerFixtures } from '@qa-cortex/core/guard';
import { qaConfig } from './qa.config.js';

export const test = base
  .extend<object, ConfigWorkerFixtures<CoreSchema>>(configFixtures(qaConfig))
  .extend<object, ProductionGuardWorkerFixtures>(
    productionGuardFixtures({ reporters: process.env.QAC_GUARD_REPORTERS === 'error' ? 'error' : 'warn' }),
  );

export { expect } from '@playwright/test';
