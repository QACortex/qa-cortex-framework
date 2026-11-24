// Compile-only type tests for @qa-cortex/core/secrets (TypeScript 6.0.3, `npm run typecheck`).
// One invalid case per statement (ADR 0005). Not executed.
import { test as base } from '@playwright/test';
import { configFixtures, defineQaConfig, type ConfigWorkerFixtures, type CoreSchema } from '@qa-cortex/core/config';
import { loggerFixtures, type LoggerTestFixtures, type LoggerWorkerFixtures } from '@qa-cortex/core/logger';
import {
  defineSecrets,
  loadSecrets,
  secretsFixtures,
  type RequiredSecretName,
  type Secret,
  type SecretStore,
  type SecretsWorkerFixtures,
} from '@qa-cortex/core/secrets';

const secretsDef = defineSecrets({
  adminPassword: { env: 'ADMIN_PASSWORD' },
  apiToken: { env: { local: 'LOCAL_API_TOKEN', staging: 'STAGING_API_TOKEN' } },
  basicAuth: { env: 'BASIC_AUTH_PASSWORD', optional: true },
});
type Entries = (typeof secretsDef)['entries'];

// ---------------------------------------------------------------- get() vs find()
const store: SecretStore<Entries> = loadSecrets(secretsDef, { profile: 'local' });
const admin: Secret = store.get('adminPassword');
const token: Secret | undefined = store.find('apiToken');
const basic: Secret | undefined = store.find('basicAuth');
const required: RequiredSecretName<Entries> = 'adminPassword';
void [admin, token, basic, required];
// @ts-expect-error optional secrets are read with find()
store.get('basicAuth');
// @ts-expect-error per-profile secrets may be absent: read them with find()
store.get('apiToken');
// @ts-expect-error unknown secret
store.find('nope');
// @ts-expect-error find() may return undefined
const notChecked: Secret = store.find('basicAuth');
void notChecked;
// @ts-expect-error a Secret is not a string: reveal() it explicitly
const asString: string = store.get('adminPassword');
void asString;
const revealed: string = store.get('adminPassword').reveal();
void revealed;
// @ts-expect-error profile is required
loadSecrets(secretsDef, {});
// @ts-expect-error env must be a name or a per-profile map
defineSecrets({ bad: { env: 42 } });

// ---------------------------------------------------------------- fixtures
const qaConfig = defineQaConfig({ base: { baseURL: 'http://localhost:3000' }, profiles: { local: {} } });

const test = base
  .extend<object, ConfigWorkerFixtures<CoreSchema>>(configFixtures(qaConfig))
  .extend<LoggerTestFixtures, LoggerWorkerFixtures>(loggerFixtures())
  .extend<object, SecretsWorkerFixtures<Entries>>(secretsFixtures(secretsDef));
test('fixtures are typed', ({ qaSecretStore, qaSecrets, qaSecretsCheck, qaLog }) => {
  const s: Secret = qaSecretStore.get('adminPassword');
  const values: readonly string[] = qaSecrets;
  const check: void = qaSecretsCheck; // automatic worker fixture; requesting it is optional
  void check;
  qaLog.info('typed', { s });
  void values;
});

const spread = base.extend<LoggerTestFixtures, ConfigWorkerFixtures<CoreSchema> & LoggerWorkerFixtures & SecretsWorkerFixtures<Entries>>({
  ...configFixtures(qaConfig),
  ...loggerFixtures(),
  ...secretsFixtures(secretsDef),
});
void spread;

// @ts-expect-error secretsFixtures() needs qaConfig (configFixtures) in the base test
base.extend<object, SecretsWorkerFixtures<Entries>>(secretsFixtures(secretsDef));
