/** Severity, lowest to highest. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const LOG_LEVELS: readonly LogLevel[] = Object.freeze(['debug', 'info', 'warn', 'error'] as const);

/** Test metadata stamped on every record by the `qaLog` fixture. */
export interface LogTestMetadata {
  readonly title: string;
  readonly titlePath: readonly string[];
  readonly project: string;
  readonly worker: number;
  readonly parallelIndex: number;
  readonly retry: number;
  readonly testId: string;
}

/** One log entry. Every string in it has already been redacted. */
export interface LogRecord {
  /** ISO 8601 timestamp. */
  readonly time: string;
  readonly level: LogLevel;
  readonly msg: string;
  /** Bindings from child() loggers, if any. */
  readonly context?: Readonly<Record<string, unknown>>;
  /** Structured data passed with the call, if any (JSON-safe, redacted). */
  readonly data?: unknown;
  /** Present when the logger belongs to a Playwright test. */
  readonly test?: LogTestMetadata;
}

export interface Logger {
  debug(msg: string, data?: unknown): void;
  info(msg: string, data?: unknown): void;
  warn(msg: string, data?: unknown): void;
  error(msg: string, data?: unknown): void;
  /** A logger that adds `bindings` to the context of every record. Same level, secrets and sink. */
  child(bindings: Readonly<Record<string, unknown>>): Logger;
}

export interface LoggerOptions {
  /** Minimum level written. Default "info". */
  readonly level?: LogLevel | undefined;
  /** Secret values to redact wherever they appear (values shorter than 4 characters are ignored). */
  readonly redact?: readonly string[] | undefined;
  /**
   * Where records go, called synchronously with an already-redacted record. Default: one
   * readable line on stdout (debug/info) or stderr (warn/error). If the sink throws, that
   * logging call throws the same error (not swallowed, not retried); later calls still work.
   */
  readonly sink?: ((record: LogRecord) => void) | undefined;
  /** Initial context bindings. */
  readonly bindings?: Readonly<Record<string, unknown>> | undefined;
  /** Test metadata to stamp on records. Set by the `qaLog` fixture. */
  readonly test?: LogTestMetadata | undefined;
}
