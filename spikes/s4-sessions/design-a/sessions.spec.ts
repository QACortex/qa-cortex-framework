import { expect, test } from '@playwright/test';
import { EXPIRY_TEST } from '../src/run-env.js';
import { readStore } from './store.js';

test.describe('admin (browser via test.use)', () => {
  test.use({ storageState: readStore.paths('admin').state });
  for (let i = 0; i < 4; i++) {
    test(`admin page #${i}`, async ({ page }) => {
      await page.goto('/admin');
      await expect(page.getByRole('heading')).toHaveText('Admin area');
    });
  }
});

test.describe('viewer (browser via test.use)', () => {
  test.use({ storageState: readStore.paths('viewer').state });
  for (let i = 0; i < 4; i++) {
    test(`viewer is forbidden from admin #${i}`, async ({ page }) => {
      const res = await page.goto('/admin');
      expect(res?.status()).toBe(403);
    });
  }
});

test('API as admin: same role definition, bearer header + cookies', async ({ playwright }) => {
  const admin = await readStore.ensure('admin');
  const api = await playwright.request.newContext(admin.requestContextOptions());
  expect(await (await api.get('/api/me')).json()).toEqual({ user: 'admin' });
  expect((await api.get('/me')).status()).toBe(200); // cookie half works for API too
  await api.dispose();
});

test('two roles in one test: admin and viewer side by side', async ({ browser, playwright }) => {
  const [admin, viewer] = await Promise.all([readStore.ensure('admin'), readStore.ensure('viewer')]);
  const adminCtx = await browser.newContext(admin.browserContextOptions());
  const viewerCtx = await browser.newContext(viewer.browserContextOptions());
  const viewerApi = await playwright.request.newContext(viewer.requestContextOptions());
  const [a, v] = [await adminCtx.newPage(), await viewerCtx.newPage()];
  await a.goto('/me');
  await v.goto('/me');
  await expect(a.getByRole('heading')).toHaveText('Hello admin');
  await expect(v.getByRole('heading')).toHaveText('Hello viewer');
  expect(await (await viewerApi.get('/api/me')).json()).toEqual({ user: 'viewer' });
  await Promise.all([adminCtx.close(), viewerCtx.close(), viewerApi.dispose()]);
});

test('expiry mid-run', async ({ playwright }) => {
  test.skip(!EXPIRY_TEST, 'S4_EXPIRY only');
  test.setTimeout(30_000);
  const first = await readStore.ensure('admin');
  const api1 = await playwright.request.newContext(first.requestContextOptions());
  expect((await api1.get('/api/me')).status()).toBe(200);
  await new Promise((r) => setTimeout(r, Number(process.env.S4_TTL_MS) + 500));
  // Design A has no way to refresh from inside a test: the cached header is now dead.
  expect((await api1.get('/api/me')).status()).toBe(401);
  await expect(readStore.ensure('admin')).rejects.toThrow(/tests may not log in/);
  await api1.dispose();
});
