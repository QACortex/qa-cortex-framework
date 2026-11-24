// test.use() turns tracing on for this file only; the runtime guard must see it.
import { test } from './fixtures.js';

test.use({ trace: 'on' });

test('opens a page with test.use({ trace: "on" })', async ({ page }) => {
  await page.setContent('<p>should never run in a blocked production worker</p>');
});
