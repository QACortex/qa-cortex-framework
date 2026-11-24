import { test, expect } from '@playwright/test';
test('reads env', () => {
  expect(process.env.QA_PROFILE ?? 'local').toBeTruthy();
});
