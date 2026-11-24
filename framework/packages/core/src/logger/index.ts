// @qa-cortex/core/logger: structured, redacting logging (ADR 0007).
//
// createLogger() works anywhere. loggerFixtures() adds a per-test `qaLog` to your own
// test.extend(): readable lines on stdout plus a redacted JSON Lines attachment.
// Redaction covers only what this logger writes; Playwright's own traces and reports are
// not touched (ADR 0003). Independent of @qa-cortex/core/config.

export { createLogger } from './logger.js';
export { formatJsonLine, formatLine } from './format.js';
export { REDACTED, MIN_SECRET_LENGTH } from './redact.js';
export { LOG_LEVELS, type LogLevel, type LogRecord, type LogTestMetadata, type Logger, type LoggerOptions } from './types.js';
export {
  LOG_ATTACHMENT_NAME,
  loggerFixtures,
  type LogAttachMode,
  type LoggerTestFixtures,
  type LoggerWorkerFixtures,
} from './fixtures.js';
