// The user's own `test`, extended with QA Cortex config fixtures.
import { test as base } from '@playwright/test';
import { configFixtures, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { qaConfig, type schema } from './qa.config.js';

export const test = base.extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig));
export { expect } from '@playwright/test';

export function expectedProfile(projectName: string): string {
  return projectName === 'staging' ? 'staging' : process.env.QA_CORTEX_PROFILE?.trim() || 'local';
}
