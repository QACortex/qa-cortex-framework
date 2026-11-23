import { expect, test } from './fixtures.js';

test('opens the home page of the selected environment', async ({ page, qa }, testInfo) => {
  testInfo.annotations.push({ type: 'environment', description: `${qa.profile}: ${qa.site.label} → ${qa.baseURL}` });

  // './' resolves against baseURL, which comes from the selected QA Cortex profile.
  await page.goto('./');

  // Prefix match: single-page apps may add a route after load (TodoMVC adds `#/`).
  await expect(page).toHaveURL(new RegExp(`^${escapeRegExp(qa.baseURL)}`));
  await expect(page).toHaveTitle(new RegExp(escapeRegExp(qa.site.titleContains)));

  console.log(`profile=${qa.profile} url=${page.url()} title="${await page.title()}"`);
});

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
