// Config and logger fixtures from the packed package (no browser needed).
import { createLogger, REDACTED, type LogRecord } from '@qa-cortex/core/logger';
import { SECRET, expect, test } from './fixtures.js';

test('configFixtures(): qaConfig is typed, frozen and from the selected profile', ({ qaConfig, qaProfile }) => {
  const heading: string = qaConfig.app.heading;
  expect(heading).toBe('QA Cortex compatibility');
  expect(qaConfig.profile).toBe('local');
  expect(qaProfile).toBeUndefined();
  expect(Object.isFrozen(qaConfig)).toBe(true);
});

test('secretsFixtures(): typed store for the profile, values redacted in qaLog', ({ qaConfig, qaSecretStore, qaLog }) => {
  const secret = qaSecretStore.get('compatSecret');
  expect(qaSecretStore.profile).toBe(qaConfig.profile);
  expect(qaSecretStore.find('notSet')).toBeUndefined();
  expect(String(secret)).toBe('[REDACTED]');
  // The driver checks the output: the revealed value must appear only as [REDACTED].
  qaLog.info(`compat secret ${secret.reveal()}`, { secret });
});

test('loggerFixtures(): qaLog writes redacted records', ({ qaLog }) => {
  // The driver checks the console output: the secret must appear only as [REDACTED].
  qaLog.info(`compat token ${SECRET}`, { password: 'redacted by key name' });
  const records: LogRecord[] = [];
  createLogger({ redact: [SECRET], sink: (r) => records.push(r) }).info(`check ${SECRET}`);
  expect(records[0]?.msg).toBe(`check ${REDACTED}`);
});
