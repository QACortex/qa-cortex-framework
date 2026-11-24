// Playwright fixtures for the secrets module (ADR 0008, fixture contract from ADR 0006).
// Returns a plain fixtures object for the user's own `test.extend()`; Playwright is imported
// for types only. Reads the profile from `qaConfig` by name (no import of the config module),
// and fills the logger's `qaSecrets` contract (ADR 0007) without importing the logger.
import type { WorkerFixture } from '@playwright/test';
import { SecretsError } from './errors.js';
import { loadSecrets, redactionValues } from './load.js';
import type { SecretEntries, SecretStore, SecretsDefinition } from './types.js';

export type SecretsWorkerFixtures<E extends SecretEntries = SecretEntries> = {
  /** Secrets for this worker's profile (`qaConfig.profile`), loaded once per worker. */
  qaSecretStore: SecretStore<E>;
  /**
   * Every loaded value, for the logger's redaction (the `qaSecrets` contract of
   * loggerFixtures()). Meant for the logger only: read secrets in tests through qaSecretStore.
   */
  qaSecrets: readonly string[];
  /**
   * Automatic check, once per worker, before any test: the EFFECTIVE `qaSecrets` must contain
   * every loaded secret. It fails when a later `loggerFixtures()` (chained, spread or
   * mergeTests) has replaced the list with its empty default, so redaction can never be lost
   * silently. Overrides that add values pass. The error names secrets, never values.
   */
  qaSecretsCheck: void;
};

/** What the base test must already provide: the config fixtures' `qaConfig` (any schema). */
export type SecretsFixtureDependencies = { qaConfig: { readonly profile: string } };

/**
 * The object secretsFixtures() returns. Spelled out (rather than Playwright's `Fixtures`) so
 * `qaConfig` is only a dependency, not a fixture this object could override.
 */
export type SecretsFixtures<E extends SecretEntries = SecretEntries> = {
  qaSecretStore: [WorkerFixture<SecretStore<E>, SecretsFixtureDependencies>, { scope: 'worker'; box: boolean }];
  qaSecrets: [WorkerFixture<readonly string[], Pick<SecretsWorkerFixtures<E>, 'qaSecretStore'>>, { scope: 'worker'; box: boolean }];
  qaSecretsCheck: [
    WorkerFixture<void, Pick<SecretsWorkerFixtures<E>, 'qaSecretStore' | 'qaSecrets'>>,
    { scope: 'worker'; auto: true; box: boolean },
  ];
};

/**
 * Secrets fixtures for your own `test.extend()`. The base test must have configFixtures().
 * Put it AFTER loggerFixtures(): its `qaSecrets` replaces the logger's empty default. In the
 * wrong order the automatic `qaSecretsCheck` fails every worker before any test runs.
 *
 * ```ts
 * base.extend<LoggerTestFixtures, ConfigWorkerFixtures<typeof schema> & LoggerWorkerFixtures & SecretsWorkerFixtures<Entries>>({
 *   ...configFixtures(qaConfig),
 *   ...loggerFixtures(),
 *   ...secretsFixtures(secretsDef),
 * });
 * ```
 */
export function secretsFixtures<E extends SecretEntries>(definition: SecretsDefinition<E>): SecretsFixtures<E> {
  return {
    qaSecretStore: [
      async ({ qaConfig }, use) => {
        await use(loadSecrets(definition, { profile: qaConfig.profile }));
      },
      { scope: 'worker', box: true },
    ],
    qaSecrets: [
      async ({ qaSecretStore }, use) => {
        await use(redactionValues(qaSecretStore));
      },
      { scope: 'worker', box: true },
    ],
    qaSecretsCheck: [
      async ({ qaSecretStore, qaSecrets }, use) => {
        const listed = new Set(qaSecrets);
        const missing = qaSecretStore.names().filter((name) => {
          const secret = qaSecretStore.find(name);
          return secret !== undefined && !listed.has(secret.reveal());
        });
        if (missing.length > 0) {
          throw new SecretsError(qaSecretStore.profile, [
            {
              secret: missing.join(', '),
              message:
                'missing from qaSecrets, so qaLog would not redact it. Apply secretsFixtures() AFTER loggerFixtures() ' +
                '(in extend() chains, spreads and mergeTests()), or keep the loaded values when you override qaSecrets.',
            },
          ]);
        }
        await use();
      },
      { scope: 'worker', auto: true, box: true },
    ],
  };
}
