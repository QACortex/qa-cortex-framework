// Regression: Playwright's own `baseURL` fixture and QA Cortex's `qaConfig` fixture must
// resolve to the same selected profile.
import { expect, test } from '../pw-fixtures/fixtures.js';

test('Playwright baseURL and qaConfig resolve to the same profile', ({ baseURL, qaConfig, qaProfile }, testInfo) => {
  console.log(`QAC_ALIGN project=${testInfo.project.name} qaProfile=${qaProfile ?? '-'} profile=${qaConfig.profile} qaConfig.baseURL=${qaConfig.baseURL} baseURL=${baseURL}`);
  expect(baseURL, 'Playwright baseURL must come from the profile qaConfig loaded').toBe(qaConfig.baseURL);
});
