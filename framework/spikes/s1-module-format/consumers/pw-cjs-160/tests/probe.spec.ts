import { test, expect } from './fixtures.js';
import { ConfigError, getLoadCount, loadConfig, moduleUrl } from '@qa-cortex/core/config';
import { logTo } from '@qa-cortex/core/logger';

test('config subpath loads, freezes, and shares one module instance', ({ cfg, baseURL }, testInfo) => {
  expect(Object.isFrozen(cfg)).toBe(true);
  expect(baseURL).toBe(cfg.baseURL);              // value flowed through playwright.config.ts
  expect(getLoadCount()).toBeGreaterThanOrEqual(1); // fixture call counted in the SAME module instance
  expect(moduleUrl).toMatch(/dist[\/]config[\/]index\.js$/);
  logTo(testInfo, 'hello');
  expect(testInfo.annotations.at(-1)?.type).toBe('qa-cortex-log');
});

test('error class survives instanceof', () => {
  try { loadConfig('bad'); throw new Error('expected throw'); }
  catch (e) { expect(e).toBeInstanceOf(ConfigError); expect((e as ConfigError).issues).toHaveLength(1); }
});
