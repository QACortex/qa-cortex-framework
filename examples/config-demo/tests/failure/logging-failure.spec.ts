// INTENTIONAL FAILURE DEMO. Excluded from every normal run (see playwright.config.ts).
// Run only with: npm run demo:logging-failure (exit code 1 is EXPECTED).
//
// This project uses qaLogAttach: 'on-failure', so:
//   - the passing test below gets NO qa-cortex-log.jsonl attachment
//   - the failing test keeps its log as a qa-cortex-log.jsonl attachment
import { DEMO_SECRET, expect, test } from '../fixtures.js';

test('passes: no log attachment under on-failure', async ({ page, qaLog }) => {
  qaLog.info('this test passes, so its log is not attached');
  await page.goto('./');
  await expect(page).toHaveURL(/./);
});

test('fails on purpose: the log is attached for diagnosis', async ({ page, qaConfig, qaLog }) => {
  qaLog.info('opening home page', { profile: qaConfig.profile });
  await page.goto('./');
  qaLog.info(`about to check the title, using token ${DEMO_SECRET}`, { password: DEMO_SECRET });
  qaLog.error('the next assertion fails on purpose to demonstrate on-failure attachments');

  // Deliberately wrong expectation. (Never put secrets in assertions: Playwright's own
  // failure output is not redacted.)
  await expect(page).toHaveTitle('QA Cortex intentional failure: this title does not exist', { timeout: 2_000 });
});
