import { consoleSink } from './format.js';
import { createRedactor, type Redactor } from './redact.js';
import { LOG_LEVELS, type LogLevel, type LogRecord, type Logger, type LoggerOptions, type LogTestMetadata } from './types.js';

const RANK: Readonly<Record<LogLevel, number>> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Create a structured, redacting logger. Works anywhere (tests, fixtures, scripts, API
 * clients); the `qaLog` fixture is built on it. Synchronous: nothing is lost on exit.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? 'info';
  if (!LOG_LEVELS.includes(level)) {
    throw new TypeError(`invalid log level "${String(level)}". Expected one of: ${LOG_LEVELS.join(', ')}`);
  }
  const redactor = createRedactor(options.redact ?? []);
  const sink = options.sink ?? consoleSink;
  const context = options.bindings ? toContext(redactor, options.bindings) : undefined;
  return build({ min: RANK[level], redactor, sink, context, test: options.test });
}

interface State {
  readonly min: number;
  readonly redactor: Redactor;
  readonly sink: (record: LogRecord) => void;
  readonly context: Readonly<Record<string, unknown>> | undefined;
  readonly test: LogTestMetadata | undefined;
}

function build(state: State): Logger {
  const write = (level: LogLevel, msg: string, data: unknown, hasData: boolean): void => {
    if (RANK[level] < state.min) return;
    const record: LogRecord = {
      time: new Date().toISOString(),
      level,
      msg: state.redactor.text(String(msg)),
      ...(state.context ? { context: state.context } : {}),
      ...(hasData ? { data: state.redactor.value(data) } : {}),
      ...(state.test ? { test: state.test } : {}),
    };
    state.sink(record);
  };
  return Object.freeze({
    debug: (msg: string, ...data: unknown[]) => write('debug', msg, data[0], data.length > 0),
    info: (msg: string, ...data: unknown[]) => write('info', msg, data[0], data.length > 0),
    warn: (msg: string, ...data: unknown[]) => write('warn', msg, data[0], data.length > 0),
    error: (msg: string, ...data: unknown[]) => write('error', msg, data[0], data.length > 0),
    child: (bindings: Readonly<Record<string, unknown>>) =>
      build({ ...state, context: Object.freeze({ ...state.context, ...toContext(state.redactor, bindings) }) }),
  });
}

function toContext(redactor: Redactor, bindings: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return Object.freeze(redactor.value(bindings) as Record<string, unknown>);
}
