// Nested project for secretsFixtures(): correct and incorrect compositions of the same fixtures.
import { test as base, mergeTests } from '@playwright/test';
import { configFixtures, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { loggerFixtures, type LoggerTestFixtures, type LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { defineSecrets, secretsFixtures, type SecretsWorkerFixtures } from '@qa-cortex/core/secrets';
import { qaConfig, type schema } from '../pw-fixtures/qa.config.js';

export const secretsDef = defineSecrets({
  adminPassword: { env: 'QAC_TEST_ADMIN_PASSWORD' },
  apiToken: { env: { local: 'QAC_TEST_LOCAL_TOKEN', staging: 'QAC_TEST_STAGING_TOKEN' } },
  basicAuth: { env: 'QAC_TEST_BASIC_AUTH', optional: true },
});
type Entries = (typeof secretsDef)['entries'];
type Config = ConfigWorkerFixtures<typeof schema>;
type Secrets = SecretsWorkerFixtures<Entries>;

const withConfig = base.extend<object, Config>(configFixtures(qaConfig));
const withLogger = withConfig.extend<LoggerTestFixtures, LoggerWorkerFixtures>(loggerFixtures());
const withSecrets = withConfig.extend<object, Secrets>(secretsFixtures(secretsDef));

// ---------------------------------------------------------------- correct: these run
/** config → logger → secrets, one extend() each (the documented order). */
export const chained = withLogger.extend<object, Secrets>(secretsFixtures(secretsDef));

/** All three spread into one extend(), secrets last. */
export const spread = base.extend<LoggerTestFixtures, Config & LoggerWorkerFixtures & Secrets>({
  ...configFixtures(qaConfig),
  ...loggerFixtures(),
  ...secretsFixtures(secretsDef),
});

/** mergeTests(logger test, secrets test): the secrets definition of qaSecrets comes last. */
export const merged = mergeTests(withLogger, withSecrets);

/** Secrets without the logger at all. */
export const secretsOnly = withSecrets;

/** A valid user override: keeps the loaded values (the parent value) and adds its own. */
export const userAdds = chained.extend<object, object>({
  qaSecrets: [
    async ({ qaSecrets }, use) => {
      await use([...qaSecrets, process.env.QAC_TEST_EXTRA_VALUE ?? 'extra-value']);
    },
    { scope: 'worker' },
  ],
});

// ---------------------------------------------------------------- incorrect: qaSecretsCheck must stop these
/** loggerFixtures() chained after secretsFixtures(). */
export const wrongChain = withSecrets.extend<LoggerTestFixtures, LoggerWorkerFixtures>(loggerFixtures());

/** loggerFixtures() spread after secretsFixtures(). */
export const wrongSpread = base.extend<LoggerTestFixtures, Config & LoggerWorkerFixtures & Secrets>({
  ...configFixtures(qaConfig),
  ...secretsFixtures(secretsDef),
  ...loggerFixtures(),
});

/** mergeTests(secrets test, logger test): the logger's empty default comes last. */
export const wrongMerge = mergeTests(withSecrets, withLogger);

/** An invalid user override that drops the loaded values. */
export const userDrops = chained.extend<object, object>({
  qaSecrets: [
    async ({}, use) => {
      await use([]);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
