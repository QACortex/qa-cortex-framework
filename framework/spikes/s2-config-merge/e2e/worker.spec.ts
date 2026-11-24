import { loadConfig } from '../src/config/index.js';
import { qaConfig, recordEvaluation } from './qa.config.js';
import { expect, test } from './fixtures.js';

recordEvaluation('spec module');

for (let i = 0; i < 4; i++) {
  test(`option fixture delivers a live, frozen config #${i}`, ({ qaConfig: cfg, baseURL }, testInfo) => {
    // If Playwright serialised `use` values to workers, frozenness would be lost.
    expect(Object.isFrozen(cfg)).toBe(true);
    expect(Object.isFrozen(cfg.app)).toBe(true);
    expect(cfg.baseURL).toBe(baseURL);
    if (testInfo.project.name === 'staging') expect(cfg.profile).toBe('staging');
    else expect(cfg.profile).toBe(process.env.QA_PROFILE?.trim() || 'local');
  });
}

test('direct import pattern: loading again in a worker gives an equal config', ({ qaConfig: cfg }, testInfo) => {
  test.skip(testInfo.project.name === 'staging', 'env-profile project only');
  expect(loadConfig(qaConfig)).toEqual(cfg);
});
