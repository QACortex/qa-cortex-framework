// The project's own `test`, extended with QA Cortex fixtures:
//   config:  qaConfig (validated, frozen, once per worker) and qaProfile (per-project option)
//   logger:  qaLog (per test), qaLogLevel / qaLogAttach (options)
//   secrets: qaSecretStore (typed secrets for the profile); also fills the logger's qaSecrets,
//            so every loaded secret is redacted in qaLog output
//   guard:   qaProductionGuard (automatic): in a production profile, fails the worker before a
//            browser starts if traces, videos or screenshots would be recorded (even via --trace on)
//   pages:   one page object per lab scenario, built on this test's own `page` (test-scoped, so
//            every test gets fresh objects and stays isolated). Construction only: tests call
//            open() themselves, so navigation stays visible in the test.
import { test as base } from '@playwright/test';
import { configFixtures, type ConfigWorkerFixtures } from '@qa-cortex/core/config';
import { productionGuardFixtures, type ProductionGuardWorkerFixtures } from '@qa-cortex/core/guard';
import { loggerFixtures, type LoggerTestFixtures, type LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import { secretsFixtures, type SecretsWorkerFixtures } from '@qa-cortex/core/secrets';
import { CheckBoxPage } from '../pages/check-box.page.js';
import { DropdownPage } from '../pages/dropdown.page.js';
import { TextBoxPage } from '../pages/text-box.page.js';
import { TextValidationPage } from '../pages/text-validation.page.js';
import { qaConfig, type schema } from '../qa.config.js';
import { secretsDef, type ProjectSecrets } from '../qa.secrets.js';

/** Page object fixtures: request one by name, for example `async ({ textBoxPage }) => ...`. */
export type PageFixtures = {
  textBoxPage: TextBoxPage;
  checkBoxPage: CheckBoxPage;
  dropdownPage: DropdownPage;
  textValidationPage: TextValidationPage;
};

export const test = base
  .extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(qaConfig))
  .extend<LoggerTestFixtures, LoggerWorkerFixtures>(loggerFixtures())
  // After loggerFixtures(): its qaSecrets replaces the logger's empty default.
  .extend<object, SecretsWorkerFixtures<ProjectSecrets>>(secretsFixtures(secretsDef))
  .extend<object, ProductionGuardWorkerFixtures>(productionGuardFixtures())
  .extend<PageFixtures>({
    textBoxPage: ({ page }, use) => use(new TextBoxPage(page)),
    checkBoxPage: ({ page }, use) => use(new CheckBoxPage(page)),
    dropdownPage: ({ page }, use) => use(new DropdownPage(page)),
    textValidationPage: ({ page }, use) => use(new TextValidationPage(page)),
  });

export { expect } from '@playwright/test';
