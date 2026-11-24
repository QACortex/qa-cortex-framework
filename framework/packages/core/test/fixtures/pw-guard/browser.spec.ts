// Requests `page`. Only run where the guard must block: if the guard ran too late, the browser
// launch would be attempted (and fail in CI, where no browser is installed).
import { test } from './fixtures.js';

test('opens a page', async ({ page }) => {
  await page.setContent('<p>should never run in a blocked production worker</p>');
});
