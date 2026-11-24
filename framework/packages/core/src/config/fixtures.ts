// Playwright fixtures for the config module (ADR 0006).
//
// Returns a plain fixtures object for the user's OWN `test.extend()`. QA Cortex never creates
// a `test` object and only imports Playwright for types, so it can never load a second copy
// of Playwright (ADR 0001).
import type { Fixtures } from '@playwright/test';
import type { z } from 'zod';
import { loadConfig, type ConfigDefinition, type LoadedConfig } from './load.js';
import type { ConfigSchema } from './schema.js';

/** Worker fixtures added by {@link configFixtures}. */
export type ConfigWorkerFixtures<S extends ConfigSchema> = {
  /**
   * Profile for this worker. Set it per Playwright project with `use: { qaProfile: 'staging' }`.
   * When undefined, loadConfig() falls back to QA_CORTEX_PROFILE, then defaultProfile, then "local".
   */
  qaProfile: string | undefined;
  /**
   * The validated, frozen config for `qaProfile`. Loaded once per worker, on first use.
   * Same type as `ConfigOf<S>`, spelled via the output type so editor hovers show fields.
   */
  qaConfig: LoadedConfig<z.output<S>>;
};

/**
 * Worker-scoped config fixtures to pass to your own `test.extend()`:
 *
 * ```ts
 * export const test = base.extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig));
 * ```
 *
 * Other fixtures (yours, or future QA Cortex modules) depend on the config by name: `qaConfig`.
 */
export function configFixtures<S extends ConfigSchema>(definition: ConfigDefinition<S>): Fixtures<object, ConfigWorkerFixtures<S>> {
  return {
    qaProfile: [undefined, { scope: 'worker', option: true }],
    qaConfig: [
      async ({ qaProfile }, use) => {
        await use(loadConfig(definition, { profile: qaProfile }));
      },
      { scope: 'worker', box: true },
    ],
  };
}
