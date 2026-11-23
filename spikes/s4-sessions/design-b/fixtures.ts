import { test as base } from '@playwright/test';
import { BASE_URL, roles } from '../src/app-roles.js';
import { SessionStore, type SessionHandle } from '../src/sessions.js';
import { AUTH_DIR, SKEW_MS } from '../src/run-env.js';

type TestFixtures = {
  /** Set with test.use({ role: 'admin' }) to make the default page/context that role. */
  role: string | undefined;
  /** For extra roles in one test: `const viewer = await session('viewer')`. */
  session: (role: string) => Promise<SessionHandle>;
};
type WorkerFixtures = { sessionStore: SessionStore };

export const test = base.extend<TestFixtures, WorkerFixtures>({
  sessionStore: [
    async ({ playwright }, use) => {
      await use(
        new SessionStore({
          dir: AUTH_DIR,
          roles,
          refreshSkewMs: SKEW_MS,
          lock: !process.env.S4_NOLOCK,
          newRequestContext: (opts) => playwright.request.newContext({ baseURL: BASE_URL, ...opts }),
        }),
      );
    },
    { scope: 'worker' },
  ],
  role: [undefined, { option: true }],
  // Override Playwright's own storageState option: composition, not wrapping.
  storageState: async ({ role, sessionStore, storageState }, use) => {
    await use(role ? (await sessionStore.ensure(role)).storageStatePath : storageState);
  },
  session: async ({ sessionStore }, use) => {
    await use((r) => sessionStore.ensure(r));
  },
});
export { expect } from '@playwright/test';
