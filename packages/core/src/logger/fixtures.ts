// Playwright fixtures for the logger (ADR 0007, fixture contract from ADR 0006).
// Returns a plain fixtures object for the user's own `test.extend()`; Playwright is imported
// for types only. Independent of the config module: no fixture depends on `qaConfig`.
import type { Fixtures, TestInfo } from '@playwright/test';
import { consoleSink, formatJsonLine } from './format.js';
import { createLogger } from './logger.js';
import type { LogLevel, LogTestMetadata, Logger } from './types.js';

/** When the per-test `qa-cortex-log.jsonl` attachment is written. */
export type LogAttachMode = 'always' | 'on-failure' | 'off';

export const LOG_ATTACHMENT_NAME = 'qa-cortex-log.jsonl';

export type LoggerTestFixtures = {
  /** Structured, redacting logger for this test. */
  qaLog: Logger;
};

export type LoggerWorkerFixtures = {
  /** Minimum level. Worker option; set per project with `use: { qaLogLevel: 'debug' }`. Default "info". */
  qaLogLevel: LogLevel;
  /** Attachment policy. Worker option. Default "on-failure" (like trace: 'retain-on-failure'). */
  qaLogAttach: LogAttachMode;
  /**
   * Secret values to redact. Override the FIXTURE (not a `use` option) so secrets come from
   * code, never from config: `qaSecrets: [async ({}, use) => use([...]), { scope: 'worker' }]`.
   */
  qaSecrets: readonly string[];
};

/** Logger fixtures to pass to your own `test.extend()`. */
export function loggerFixtures(): Fixtures<LoggerTestFixtures, LoggerWorkerFixtures> {
  return {
    qaLogLevel: ['info', { scope: 'worker', option: true }],
    qaLogAttach: ['on-failure', { scope: 'worker', option: true }],
    qaSecrets: [
      async ({}, use) => {
        await use([]);
      },
      { scope: 'worker' },
    ],
    qaLog: [
      async ({ qaLogLevel, qaLogAttach, qaSecrets }, use, testInfo) => {
        const lines: string[] = [];
        const logger = createLogger({
          level: qaLogLevel,
          redact: qaSecrets,
          test: metadata(testInfo),
          sink: (record) => {
            consoleSink(record); // Playwright captures stdout/stderr per test for every reporter
            lines.push(formatJsonLine(record));
          },
        });
        await use(logger);
        const failed = testInfo.status !== testInfo.expectedStatus;
        if (lines.length > 0 && (qaLogAttach === 'always' || (qaLogAttach === 'on-failure' && failed))) {
          await testInfo.attach(LOG_ATTACHMENT_NAME, { body: `${lines.join('\n')}\n`, contentType: 'application/x-ndjson' });
        }
      },
      { box: true },
    ],
  };
}

function metadata(testInfo: TestInfo): LogTestMetadata {
  return Object.freeze({
    title: testInfo.title,
    titlePath: Object.freeze([...testInfo.titlePath]),
    project: testInfo.project.name,
    worker: testInfo.workerIndex,
    parallelIndex: testInfo.parallelIndex,
    retry: testInfo.retry,
    testId: testInfo.testId,
  });
}
