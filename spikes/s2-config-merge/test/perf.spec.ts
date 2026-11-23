import { test } from '@playwright/test';
import { loadConfig } from '../src/config/index.js';
import { qaConfig } from '../e2e/qa.config.js';

test('cost of one loadConfig call', () => {
  for (let i = 0; i < 200; i++) loadConfig(qaConfig, { env: {} }); // warm up
  const n = 5_000, t0 = performance.now();
  for (let i = 0; i < n; i++) loadConfig(qaConfig, { env: {}, profile: i % 2 ? 'local' : 'staging' });
  console.log(`loadConfig: ${(((performance.now() - t0) / n) * 1000).toFixed(1)} µs/call`);
});
