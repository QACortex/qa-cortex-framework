// Compile-only type tests for @qa-cortex/core/logger (TypeScript 6.0.3, `npm run typecheck`).
// One invalid case per statement (ADR 0005). Not executed.
import { test as base, defineConfig } from '@playwright/test';
import { configFixtures, defineQaConfig, type ConfigWorkerFixtures, type CoreSchema } from '@qa-cortex/core/config';
import {
  createLogger,
  loggerFixtures,
  type LogLevel,
  type LogRecord,
  type Logger,
  type LoggerTestFixtures,
  type LoggerWorkerFixtures,
} from '@qa-cortex/core/logger';

// ---------------------------------------------------------------- createLogger
const log: Logger = createLogger({ level: 'debug', redact: ['s3cret'], sink: (r: LogRecord) => void r.msg });
log.info('message');
log.info('message', { any: ['data', 1] });
log.child({ page: 'checkout' }).warn('w');
// @ts-expect-error unknown level
createLogger({ level: 'verbose' });
// @ts-expect-error message must be a string
log.info({ msg: 'x' });
// @ts-expect-error no such method
log.trace('x');

// ---------------------------------------------------------------- fixtures, alone
const test = base.extend<LoggerTestFixtures, LoggerWorkerFixtures>(loggerFixtures());
test('qaLog is a Logger; options are typed', ({ qaLog, qaLogLevel, qaLogAttach, qaSecrets }) => {
  const l: Logger = qaLog;
  const level: LogLevel = qaLogLevel;
  const attach: 'always' | 'on-failure' | 'off' = qaLogAttach;
  const secrets: readonly string[] = qaSecrets;
  void [l, level, attach, secrets];
});

const inferred = base.extend(loggerFixtures());
inferred('inference works without the explicit generic', ({ qaLog }) => {
  qaLog.info('x');
});

test.use({ qaLogLevel: 'debug', qaLogAttach: 'always' });
// @ts-expect-error unknown level
test.use({ qaLogLevel: 'verbose' });
// @ts-expect-error unknown attachment mode
test.use({ qaLogAttach: 'sometimes' });
defineConfig<object, LoggerWorkerFixtures>({ projects: [{ name: 'p', use: { qaLogLevel: 'warn', qaLogAttach: 'off' } }] });

// ---------------------------------------------------------------- secrets come from a fixture override
const withSecrets = test.extend<object, LoggerWorkerFixtures>({
  qaSecrets: [
    async ({}, use) => {
      await use(['from-a-vault']);
    },
    { scope: 'worker' },
  ],
});
void withSecrets;

const badSecrets = test.extend<object, LoggerWorkerFixtures>({
  // @ts-expect-error secrets are strings
  qaSecrets: [async ({}, use) => use([42]), { scope: 'worker' }],
});
void badSecrets;

// ---------------------------------------------------------------- composed with config fixtures
const def = defineQaConfig({ base: { baseURL: 'http://x.test' }, profiles: { local: {} } });
const both = base
  .extend<object, ConfigWorkerFixtures<CoreSchema>>(configFixtures(def))
  .extend<LoggerTestFixtures, LoggerWorkerFixtures>(loggerFixtures());
both('config and logger together', ({ qaLog, qaConfig }) => {
  qaLog.info('profile', { profile: qaConfig.profile });
});
