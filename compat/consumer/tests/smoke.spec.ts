// Chromium smoke test against the local server (server.mjs): no external websites.
import { expect, test } from './fixtures.js';

test('chromium opens the local page from qaConfig.baseURL', async ({ page, qaConfig, qaLog }) => {
  qaLog.info('opening local page', { baseURL: qaConfig.baseURL });
  await page.goto('/');
  await expect(page).toHaveTitle(qaConfig.app.heading);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(qaConfig.app.heading);
});
