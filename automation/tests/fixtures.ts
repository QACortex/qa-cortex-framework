// The project's own `test`, extended with QA Cortex fixtures:
//   config:  qaConfig (validated, frozen, once per worker) and qaProfile (per-project option)
//   logger:  qaLog (per test), qaLogLevel / qaLogAttach (options)
//   secrets: qaSecretStore (typed secrets for the profile); also fills the logger's qaSecrets,
//            so every loaded secret is redacted in qaLog output
//   guard:   qaProductionGuard (automatic): in a production profile, fails the worker before a
//            browser starts if traces, videos or screenshots would be recorded (even via --trace on)
import { test as base } from '@playwright/test';
import { configFixtures, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { productionGuardFixtures, type ProductionGuardWorkerFixtures } from '@qa-cortex/core/guard';
import { loggerFixtures, type LoggerTestFixtures, type LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { secretsFixtures, type SecretsWorkerFixtures } from '@qa-cortex/core/secrets';
import { qaConfig, type schema } from '../qa.config.js';
import { secretsDef, type ProjectSecrets } from '../qa.secrets.js';

export const test = base
  .extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig))
  .extend<LoggerTestFixtures, LoggerWorkerFixtures>(loggerFixtures())
  // After loggerFixtures(): its qaSecrets replaces the logger's empty default.
  .extend<object, SecretsWorkerFixtures<ProjectSecrets>>(secretsFixtures(secretsDef))
  .extend<object, ProductionGuardWorkerFixtures>(productionGuardFixtures());

export { expect } from '@playwright/test';
