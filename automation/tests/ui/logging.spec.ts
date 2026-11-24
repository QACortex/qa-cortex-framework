// Logging demo (passing). Run with: npm run demo:logging
// Shows every level, structured data, child context and redaction of a synthetic secret.
import { DEMO_SECRET, expect, test } from '../fixtures.js';

test('logs at every level while visiting the selected environment', async ({ page, qaConfig, qaLog }) => {
  // child(): every record below carries this context.
  const log = qaLog.child({ profile: qaConfig.profile });

  log.debug('resolved configuration', { baseURL: qaConfig.baseURL, site: qaConfig.site.label });
  log.info('opening home page');
  await page.goto('./');

  const title = await page.title();
  log.info('page loaded', { title, url: page.url() });

  // Redaction demo: the synthetic secret appears in the message, in a value and under a
  // sensitive key. Every occurrence is written as [REDACTED].
  log.info(`signing in with token ${DEMO_SECRET}`, {
    user: 'demo-user',
    password: 'any value under a sensitive key is redacted',
    note: `secret inside free text: ${DEMO_SECRET}`,
    callbackUrl: `https://example.test/cb?token=${encodeURIComponent(DEMO_SECRET)}`,
  });

  log.warn('demo warning: this is what a warning looks like', { thresholdMs: 1000 });
  log.error('demo error record: logged at error level, but this test still passes', { code: 'DEMO_ERROR' });

  await expect(page).toHaveTitle(new RegExp(qaConfig.site.titleContains));
});
