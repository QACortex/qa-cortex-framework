// No browser: used for runs the guard must let through (framework CI installs no browsers).
import { expect, test } from './fixtures.js';

test('guard lets a safe or non-production worker run', ({ qaConfig }) => {
  console.log(`QAC_GUARD_RAN profile=${qaConfig.profile} production=${String(qaConfig.production)}`);
  expect(qaConfig.profile).toBeTruthy();
});
