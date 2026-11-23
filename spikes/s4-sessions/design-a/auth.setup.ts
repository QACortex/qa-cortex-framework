import { test as setup } from '@playwright/test';
import { roles } from '../src/app-roles.js';
import { setupStore } from './store.js';

setup('log in every role', async ({ playwright, baseURL }) => {
  const store = setupStore((opts) => playwright.request.newContext({ baseURL, ...opts }));
  // Cached sessions that are still fresh are reused across local runs: no login at all.
  for (const role of roles) await store.ensure(role.name);
});
