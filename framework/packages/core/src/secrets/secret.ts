/** What a Secret shows instead of its value. Same text as the logger's REDACTED (kept separate: modules are independent). */
const HIDDEN = '[REDACTED]';

/**
 * A secret value that does not print itself.
 *
 * `String(secret)`, template literals, `JSON.stringify` and Node's `util.inspect` (which
 * `console.log` uses) all show `[REDACTED]`, and the value is held in a private field, so
 * enumerating the object (`Object.entries`, a logger serialising it) never reaches it.
 * TypeScript also refuses a Secret where Playwright expects a string, so every use needs an
 * explicit `reveal()`.
 *
 * This only covers the Secret object itself. Once revealed, the value is an ordinary string:
 * whatever receives it (a `fill()`, a header, a URL) can record it, including Playwright's
 * traces (ADR 0003).
 */
export class Secret {
  /** The name given in defineSecrets(). Not sensitive. */
  readonly name: string;
  readonly #value: string;

  constructor(name: string, value: string) {
    this.name = name;
    this.#value = value;
    Object.freeze(this);
  }

  /** The raw value. Pass it straight to the API that needs it; never log or store it. */
  reveal(): string {
    return this.#value;
  }

  toString(): string {
    return HIDDEN;
  }

  toJSON(): string {
    return HIDDEN;
  }

  [Symbol.toPrimitive](): string {
    return HIDDEN;
  }
}

// util.inspect hook, defined outside the class so the emitted declarations need no symbol type.
Object.defineProperty(Secret.prototype, Symbol.for('nodejs.util.inspect.custom'), {
  value(this: Secret): string {
    return `Secret(${this.name}) ${HIDDEN}`;
  },
});
