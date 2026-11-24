// No browser (framework CI installs none). One passing and one deliberately failing test, so
// "retain on failure" settings and the reporters have something to keep.
import { expect, test } from '@playwright/test';

test('passes', () => {
  expect(1 + 1).toBe(2);
});

test('fails on purpose', () => {
  expect(1 + 1, 'deliberate failure for the presets test').toBe(3);
});
