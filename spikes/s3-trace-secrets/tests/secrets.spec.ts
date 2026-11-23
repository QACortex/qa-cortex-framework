// One canary per channel. Values come from out/canaries.json at run time (never literals here).
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const c = JSON.parse(readFileSync('out/canaries.json', 'utf8')) as Record<string, string>;
const v = (k: string): string => {
  const value = c[k];
  if (!value) throw new Error(`no canary ${k}`);
  return value;
};

test('browser input: fill, type, evaluate, console, storage, selector, form post, server data', async ({ page, context }, testInfo) => {
  await page.goto(`/login?token=${v('urlQuery')}`);
  await page.locator('#username').fill(v('fillText'));
  await page.locator('#password').fill(v('fillPassword'));
  await page.locator('#token').pressSequentially(v('typeText'));
  await page.locator(`[data-token="${v('selector')}"]`).count();
  await page.evaluate((x) => localStorage.setItem('tok', x), v('localStorage'));
  await page.evaluate((x) => console.log(`browser says ${x}`), v('browserConsole'));
  await page.evaluate((x) => x.length, v('evaluateArg'));
  // Form POST carries username/password/token: its body is the formPostBody channel.
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  await page.goto('/profile');
  await expect(page.locator('#key')).toBeVisible();
  await page.evaluate(() => fetch('/api/token').then((r) => r.json()));
  await context.storageState({ path: testInfo.outputPath('state.json') });
});

test.describe('extra headers', () => {
  test.use({ extraHTTPHeaders: { 'X-Api-Key': v('extraHeader') } });
  test('sent by page and request fixture', async ({ page, request }) => {
    await page.goto('/api/echo');
    await request.get('/api/echo');
  });
});

test('API request context: bearer header, JSON body, token in response', async ({ request }) => {
  await request.post('/api/data', {
    headers: { Authorization: `Bearer ${v('apiBearer')}` },
    data: { password: v('apiBody') },
  });
  const res = await request.get('/api/token');
  expect((await res.json()).access_token).toBeTruthy();
});

test('cookies added by the test', async ({ page, context }) => {
  await context.addCookies([{ name: 'sid', value: v('addCookie'), url: 'http://localhost:4173' }]);
  await page.goto('/api/echo');
});

test.describe('basic auth', () => {
  test.use({ httpCredentials: { username: 'qa-user', password: v('basicAuthPass') } });
  test('httpCredentials', async ({ page }) => {
    await page.goto('/basic');
    await expect(page.getByRole('heading')).toHaveText('basic ok');
  });
});

test('test-runner surfaces: steps, params, expect message, stdout, attachments, annotations, env', async ({}, testInfo) => {
  await test.step(`log in as ${v('stepTitle')}`, async () => {});
  await test.step('step with params', async () => {}, { params: { token: v('stepParam') } } as never);
  expect(1, `checked ${v('expectMessage')}`).toBe(1);
  console.log(`stdout ${v('testStdout')}`);
  await testInfo.attach('note', { body: `attached ${v('attachBody')}`, contentType: 'text/plain' });
  testInfo.annotations.push({ type: 'info', description: `annotated ${v('annotation')}` });
  // A PASSING assertion: does the trace record the expected value?
  expect(v('expectExpected')).toBe(v('expectExpected'));
  // envOnly is in the worker's environment; test code only checks it exists (records `true`).
  expect(process.env.QAC_ENV_ONLY === v('envOnly')).toBe(true);
});

test.describe('failures', () => {
  test('failing assertion on a text input', async ({ page }) => {
    test.fail();
    await page.goto('/login');
    await page.locator('#username').fill(v('failTextValue'));
    await expect(page.locator('#username')).toHaveValue('expected-other', { timeout: 500 });
  });

  test('failing assertion on a password input', async ({ page }) => {
    if (!process.env.S3_REAL_FAIL) test.fail();
    await page.goto('/login');
    await page.locator('#password').fill(v('failPasswordValue'));
    await expect(page.locator('#password')).toHaveValue('expected-other', { timeout: 500 });
  });

  test('failing plain value comparison', () => {
    test.fail();
    expect(v('failCompare')).toBe('expected-other');
  });
});
