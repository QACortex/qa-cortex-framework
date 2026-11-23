// createLogger(): levels, records, child context and redaction. Pure: an in-memory sink,
// no Playwright fixtures. Runs against the built package through its public name.
import { expect, test } from '@playwright/test';
import { MIN_SECRET_LENGTH, REDACTED, createLogger, formatJsonLine, formatLine, type LogRecord, type LoggerOptions } from '@qa-cortex/core/logger';

function capture(options: LoggerOptions = {}): { records: LogRecord[]; log: ReturnType<typeof createLogger> } {
  const records: LogRecord[] = [];
  return { records, log: createLogger({ ...options, sink: (r) => records.push(r) }) };
}

test.describe('levels and records', () => {
  test('default level is info: debug is dropped', () => {
    const { records, log } = capture();
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(records.map((r) => r.level)).toEqual(['info', 'warn', 'error']);
  });

  test('a higher minimum level filters lower ones', () => {
    const { records, log } = capture({ level: 'warn' });
    log.info('i');
    log.warn('w');
    expect(records.map((r) => r.msg)).toEqual(['w']);
  });

  test('records carry time, level and message; data only when passed', () => {
    const { records, log } = capture({ level: 'debug' });
    log.debug('plain');
    log.info('with data', { orderId: 7 });
    log.info('explicit undefined', undefined);
    expect(records[0]).toEqual({ time: expect.any(String) as unknown, level: 'debug', msg: 'plain' });
    expect(new Date(records[0]?.time ?? '').toISOString()).toBe(records[0]?.time);
    expect(records[1]).toMatchObject({ level: 'info', msg: 'with data', data: { orderId: 7 } });
    expect(records[2]).toHaveProperty('data', undefined);
  });

  test('child() adds context, nests, and leaves the parent unchanged', () => {
    const { records, log } = capture({ bindings: { suite: 'shop' } });
    const page = log.child({ page: 'checkout' });
    page.child({ step: 'pay' }).info('paying');
    log.info('parent');
    expect(records[0]?.context).toEqual({ suite: 'shop', page: 'checkout', step: 'pay' });
    expect(records[1]?.context).toEqual({ suite: 'shop' });
  });

  test('an invalid level is rejected', () => {
    expect(() => createLogger({ level: 'verbose' as never })).toThrow(/invalid log level "verbose". Expected one of: debug, info, warn, error/);
  });

  test('loggers are frozen', () => {
    const log = createLogger({ sink: () => {} });
    expect(Object.isFrozen(log)).toBe(true);
  });

  // Documented behaviour (ADR 0007): a throwing sink makes that one call throw the sink's own
  // error. Nothing is swallowed or retried, and the logger keeps working afterwards.
  test('a throwing sink propagates its error to the caller; later calls still work', () => {
    const sinkError = new Error('sink unavailable');
    const received: LogRecord[] = [];
    let calls = 0;
    const log = createLogger({
      redact: ['topsecret-value'],
      sink: (record) => {
        calls++;
        received.push(record);
        if (calls === 1) throw sinkError;
      },
    });
    expect(() => log.info('first topsecret-value')).toThrow(sinkError); // the same error object
    expect(() => log.warn('second')).not.toThrow();
    log.debug('below the level: never reaches the sink');
    expect(calls).toBe(2);
    expect(received.map((r) => r.msg)).toEqual(['first [REDACTED]', 'second']); // redacted before the sink
  });
});

test.describe('formatting', () => {
  test('readable line and JSON line', () => {
    const record: LogRecord = { time: '2026-01-01T00:00:00.000Z', level: 'warn', msg: 'slow page', context: { page: 'cart', n: 2 }, data: { ms: 900 } };
    expect(formatLine(record)).toBe('[warn] [page=cart n=2] slow page {"ms":900}');
    expect(JSON.parse(formatJsonLine(record))).toEqual(record);
  });

  test('the default sink writes info to stdout and warn/error to stderr', () => {
    const out: string[] = [];
    const err: string[] = [];
    const [log, error] = [console.log, console.error];
    console.log = (line: string) => out.push(line);
    console.error = (line: string) => err.push(line);
    try {
      const logger = createLogger();
      logger.info('to stdout');
      logger.error('to stderr', { code: 1 });
    } finally {
      [console.log, console.error] = [log, error];
    }
    expect(out).toEqual(['[info] to stdout']);
    expect(err).toEqual(['[error] to stderr {"code":1}']);
  });
});

test.describe('redaction', () => {
  const secret = 'Sup3r-Secret!Value';

  test('secret values are redacted in messages, data, context, plain and URL-encoded', () => {
    const { records, log } = capture({ redact: [secret], bindings: { session: `sid ${secret}` } });
    log.info(`login with ${secret}`, { note: `x${secret}y`, url: `https://app.test/?p=${encodeURIComponent(secret)}`, list: [secret] });
    const json = formatJsonLine(records[0] as LogRecord);
    expect(json).not.toContain(secret);
    expect(json).not.toContain(encodeURIComponent(secret));
    expect(records[0]?.msg).toBe(`login with ${REDACTED}`);
    expect(records[0]?.data).toEqual({ note: `x${REDACTED}y`, url: `https://app.test/?p=${REDACTED}`, list: [REDACTED] });
    expect(records[0]?.context).toEqual({ session: `sid ${REDACTED}` });
  });

  test(`values shorter than ${MIN_SECRET_LENGTH} characters are not treated as secrets`, () => {
    const { records, log } = capture({ redact: ['abc', 'a'] });
    log.info('abc a');
    expect(records[0]?.msg).toBe('abc a');
  });

  test('a secret that contains another is redacted whole', () => {
    const { records, log } = capture({ redact: ['pass', 'password-long'] });
    log.info('x password-long y pass');
    expect(records[0]?.msg).toBe(`x ${REDACTED} y ${REDACTED}`);
  });

  test('values under sensitive key names are redacted, at any depth', () => {
    const { records, log } = capture();
    log.info('payload', {
      user: 'ana',
      password: 'p',
      nested: { accessToken: 't', 'X-Api-Key': 'k', headers: { Authorization: 'Bearer x', cookie: 'c' } },
      privateKeyPem: 'pem',
    });
    expect(records[0]?.data).toEqual({
      user: 'ana',
      password: REDACTED,
      nested: { accessToken: REDACTED, 'X-Api-Key': REDACTED, headers: { Authorization: REDACTED, cookie: REDACTED } },
      privateKeyPem: REDACTED,
    });
  });

  test('errors are serialised with redacted message and stack', () => {
    const { records, log } = capture({ redact: [secret] });
    log.error('failed', new TypeError(`bad token ${secret}`));
    const data = records[0]?.data as { name: string; message: string; stack: string };
    expect(data.name).toBe('TypeError');
    expect(data.message).toBe(`bad token ${REDACTED}`);
    expect(data.stack).not.toContain(secret);
  });

  test('awkward values become JSON-safe: circular, Map, Set, Date, URL, bigint, functions', () => {
    const { records, log } = capture();
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    const shared = { s: 1 };
    log.info('awkward', {
      circular,
      twice: [shared, shared],
      map: new Map([['k', 1]]),
      set: new Set([1, 2]),
      date: new Date(0),
      url: new URL('https://x.test/a'),
      big: 10n,
      fn: function named() {},
    });
    expect(records[0]?.data).toEqual({
      circular: { a: 1, self: '[Circular]' },
      twice: [{ s: 1 }, { s: 1 }], // repeated but not circular
      map: { k: 1 },
      set: [1, 2],
      date: '1970-01-01T00:00:00.000Z',
      url: 'https://x.test/a',
      big: '10n',
      fn: '[Function named]',
    });
    expect(() => formatJsonLine(records[0] as LogRecord)).not.toThrow();
  });

  test('deep, long and large values are limited', () => {
    const { records, log } = capture();
    const deep = { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } };
    log.info('limits', { deep, long: 'x'.repeat(5_000), many: Array.from({ length: 105 }, (_, i) => i) });
    const data = records[0]?.data as { deep: unknown; long: string; many: unknown[] };
    expect(JSON.stringify(data.deep)).toContain('[Object]');
    expect(data.long).toMatch(/…\[truncated 1000 chars\]$/);
    expect(data.many).toHaveLength(101);
    expect(data.many.at(-1)).toBe('…[5 more items]');
  });

  test('the caller’s data is never mutated', () => {
    const { log } = capture({ redact: [secret] });
    const input = { password: 'p', note: secret, nested: { token: 't' } };
    const copy = structuredClone(input);
    log.info('m', input);
    expect(input).toEqual(copy);
  });
});
