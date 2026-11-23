// A user's spec: the config reaches workers through an ordinary Playwright option fixture.
// No QA Cortex fixture helper is involved.
import { test as base, expect } from '@playwright/test';
import { loadConfig } from '@qa-cortex/core/config';
import { qaConfig, type AppConfig } from './qa.config.js';

const test = base.extend<object, { qaConfig: AppConfig }>({
  // Default from the environment; playwright.config.ts can override it per project.
  qaConfig: [loadConfig(qaConfig), { option: true, scope: 'worker' }],
});

for (let i = 0; i < 3; i++) {
  test(`worker receives a validated, frozen config #${i}`, ({ qaConfig: cfg, baseURL }, testInfo) => {
    expect(Object.isFrozen(cfg)).toBe(true);
    expect(Object.isFrozen(cfg.app)).toBe(true);
    expect(cfg.baseURL).toBe(baseURL); // same value Playwright's own `use.baseURL` got
    const expected = testInfo.project.name === 'staging' ? 'staging' : (process.env.QA_CORTEX_PROFILE?.trim() || 'local');
    expect(cfg.profile).toBe(expected);
    expect(cfg.app.tenant).toBe(expected === 'staging' ? 'acme-staging' : 'acme');
    console.log(`QAC_RESULT ${testInfo.project.name} profile=${cfg.profile} baseURL=${cfg.baseURL}`);
  });
}
