import type { LogRecord } from './types.js';

/**
 * Human-readable single line: `[info] message [key=value] {"data":1}`.
 * No colours: reporters colour their own output, and escape codes would leak into files.
 * Test metadata is left out: reporters already group output per test.
 */
export function formatLine(record: LogRecord): string {
  const context = record.context
    ? ` [${Object.entries(record.context)
        .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
        .join(' ')}]`
    : '';
  const data = record.data === undefined ? '' : ` ${JSON.stringify(record.data)}`;
  return `[${record.level}]${context} ${record.msg}${data}`;
}

/** One JSON Lines entry (no trailing newline). */
export function formatJsonLine(record: LogRecord): string {
  return JSON.stringify(record);
}

/** Default sink: debug/info to stdout, warn/error to stderr. */
export function consoleSink(record: LogRecord): void {
  const line = formatLine(record);
  if (record.level === 'warn' || record.level === 'error') console.error(line);
  else console.log(line);
}
