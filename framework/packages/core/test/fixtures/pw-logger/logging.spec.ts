import { expect, test } from './fixtures.js';

const secret = process.env.QAC_TEST_SECRET ?? 'missing-secret';

test('logs at every level, with the secret in message, data and context', ({ qaLog, qaConfig }) => {
  const page = qaLog.child({ page: 'login', session: `sid-${secret}` });
  page.debug('debug detail');
  page.info(`signing in with ${secret}`, {
    profile: qaConfig.profile,
    password: 'not-the-secret',
    url: `https://app.test/login?pw=${encodeURIComponent(secret)}`,
  });
  page.warn('slow response', { ms: 1200 });
  expect(qaConfig.profile).toBe('local');
});

test('fails on the first attempt, passes on retry', ({ qaLog }, testInfo) => {
  qaLog.info(`attempt ${testInfo.retry} using ${secret}`);
  if (testInfo.retry === 0) throw new Error('first attempt fails on purpose');
});
