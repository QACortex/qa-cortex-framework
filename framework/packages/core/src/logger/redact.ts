// Redaction and safe serialisation for log data (ADR 0007). Internal: not exported.
//
// Two layers:
//   1. Known secret VALUES (ADR 0003): replaced wherever they appear, plain or URL-encoded.
//   2. Sensitive KEY NAMES in structured data: their values are replaced (defence in depth).
// Output is always JSON-safe plain data; inputs are never mutated.

export const REDACTED = '[REDACTED]';

/** Secrets shorter than this are ignored: redacting "a" would wreck every line. */
export const MIN_SECRET_LENGTH = 4;

const MAX_DEPTH = 6;
const MAX_STRING = 4_000;
const MAX_ARRAY = 100;

/** Normalised (lower-case, letters and digits only) fragments that mark a key as sensitive. */
const SENSITIVE_KEY_PARTS = ['password', 'passwd', 'secret', 'token', 'authorization', 'cookie', 'apikey', 'credential', 'privatekey'];

export function isSensitiveKey(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SENSITIVE_KEY_PARTS.some((part) => normalised.includes(part));
}

export interface Redactor {
  /** Redact secret values inside a string. */
  text(value: string): string;
  /** Redact and convert any value to JSON-safe plain data. */
  value(value: unknown): unknown;
}

export function createRedactor(secrets: readonly string[]): Redactor {
  const needles = new Set<string>();
  for (const secret of secrets) {
    if (typeof secret !== 'string' || secret.length < MIN_SECRET_LENGTH) continue;
    needles.add(secret);
    needles.add(encodeURIComponent(secret));
  }
  // Longest first, so a secret that contains another is replaced whole.
  const ordered = [...needles].sort((a, b) => b.length - a.length);

  const text = (value: string): string => {
    let out = value;
    for (const needle of ordered) if (out.includes(needle)) out = out.split(needle).join(REDACTED);
    // Truncate AFTER redacting, so a cut can never leave half a secret behind.
    return out.length > MAX_STRING ? `${out.slice(0, MAX_STRING)}…[truncated ${out.length - MAX_STRING} chars]` : out;
  };

  const value = (input: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
    switch (typeof input) {
      case 'string':
        return text(input);
      case 'number':
      case 'boolean':
      case 'undefined':
        return input;
      case 'bigint':
        return `${input}n`;
      case 'symbol':
        return text(input.toString());
      case 'function':
        return `[Function ${input.name || 'anonymous'}]`;
    }
    if (input === null) return null;
    const obj = input as object;
    if (obj instanceof Error) {
      return { name: obj.name, message: text(obj.message), ...(obj.stack ? { stack: text(obj.stack) } : {}) };
    }
    if (obj instanceof Date) return Number.isNaN(obj.getTime()) ? 'Invalid Date' : obj.toISOString();
    if (obj instanceof URL) return text(obj.href);
    if (obj instanceof RegExp) return text(obj.toString());
    if (seen.has(obj)) return '[Circular]';
    if (depth >= MAX_DEPTH) return Array.isArray(obj) ? '[Array]' : '[Object]';
    seen.add(obj);
    try {
      if (obj instanceof Map) return value(Object.fromEntries(obj), depth, seen);
      if (obj instanceof Set) return value([...obj], depth, seen);
      if (Array.isArray(obj)) {
        const items = obj.slice(0, MAX_ARRAY).map((item) => value(item, depth + 1, seen));
        if (obj.length > MAX_ARRAY) items.push(`…[${obj.length - MAX_ARRAY} more items]`);
        return items;
      }
      const out: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(obj)) {
        out[key] = isSensitiveKey(key) ? REDACTED : value(item, depth + 1, seen);
      }
      return out;
    } finally {
      seen.delete(obj); // a value may appear twice without being circular
    }
  };

  return { text, value: (input) => value(input) };
}
