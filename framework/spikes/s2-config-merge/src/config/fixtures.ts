// Optional Playwright hand-off. Pure data: returns a fixtures object for the user's own test.extend().
import type { Fixtures } from '@playwright/test';

/** Worker-scoped `qaConfig` fixture holding an already-loaded config. */
export function configFixtures<C>(config: C): Fixtures<{}, { qaConfig: C }> {
  return {
    qaConfig: [
      async ({}, use) => {
        await use(config);
      },
      { scope: 'worker' },
    ],
  };
}

/**
 * Alternative: an option fixture, set from playwright.config.ts `use: { qaConfig }`.
 * Lets each Playwright project carry a different profile.
 */
export function configOption<C>(): Fixtures<{}, { qaConfig: C }> {
  // `never` cast: Playwright can't tell a generic C from a fixture function, so it rejects plain C.
  return { qaConfig: [undefined as never, { scope: 'worker', option: true }] };
}
