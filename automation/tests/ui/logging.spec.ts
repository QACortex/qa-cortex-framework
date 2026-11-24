// Logging demo (passing). Run with: npm run demo:logging
// Shows every level, structured data, child context and redaction of a synthetic secret.
import { expect, test } from '../fixtures.js';

test('logs at every level while visiting the selected environment', async ({ page, qaConfig, qaLog, qaSecretStore }) => {
  // child(): every record below carries this context.
  const log = qaLog.child({ profile: qaConfig.profile });

  log.debug('resolved configuration', { baseURL: qaConfig.baseURL, site: qaConfig.site.label });
  log.info('opening home page');
  await page.goto('./');

  const title = await page.title();
  log.info('page loaded', { title, url: page.url() });

  // Secrets: get() for one every profile has; find() for optional or per-profile ones.
  const demoToken = qaSecretStore.get('demoToken');
  const basicAuth = qaSecretStore.find('basicAuthPassword');
  log.info('secrets loaded for this profile', { names: qaSecretStore.names(), basicAuthConfigured: basicAuth !== undefined });

  // Redaction demo: the synthetic token appears revealed in the message, in a value, URL-encoded
  // and under a sensitive key: every occurrence is written as [REDACTED]. The Secret object itself
  // (under an ordinary key) is logged as {"name":"demoToken"}: its value is never enumerable.
  const token = demoToken.reveal();
  log.info(`signing in with token ${token}`, {
    user: 'demo-user',
    password: 'any value under a sensitive key is redacted',
    note: `secret inside free text: ${token}`,
    callbackUrl: `https://example.test/cb?token=${encodeURIComponent(token)}`,
    loaded: demoToken,
  });

  log.warn('demo warning: this is what a warning looks like', { thresholdMs: 1000 });
  log.error('demo error record: logged at error level, but this test still passes', { code: 'DEMO_ERROR' });

  await expect(page).toHaveTitle(new RegExp(qaConfig.site.titleContains));
});
