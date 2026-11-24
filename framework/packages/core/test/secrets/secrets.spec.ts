// @qa-cortex/core/secrets: defineSecrets(), loadSecrets(), SecretStore, Secret, SecretsError.
// Unit tests against the built package; no browser.
import { expect, test } from '@playwright/test';
import { inspect } from 'node:util';
import { MIN_SECRET_LENGTH, REDACTED, createLogger, type LogRecord } from '@qa-cortex/core/logger';
import { Secret, SecretsError, defineSecrets, loadSecrets } from '@qa-cortex/core/secrets';

const VALUE = 'synthetic-value-9f3c2a';

const def = defineSecrets({
  adminPassword: { env: 'QAC_ADMIN_PASSWORD' },
  apiToken: { env: { local: 'QAC_LOCAL_API_TOKEN', staging: 'QAC_STAGING_API_TOKEN' } },
  basicAuth: { env: 'QAC_BASIC_AUTH', optional: true },
});

/** Run fn and return the SecretsError it throws. */
function secretsError(fn: () => unknown): SecretsError {
  try {
    fn();
  } catch (error) {
    if (error instanceof SecretsError) return error;
    throw error;
  }
  throw new Error('expected a SecretsError');
}

test.describe('loadSecrets()', () => {
  test('loads required, per-profile and optional secrets for the profile', () => {
    const store = loadSecrets(def, {
      profile: 'staging',
      env: { QAC_ADMIN_PASSWORD: VALUE, QAC_STAGING_API_TOKEN: `${VALUE}-staging`, QAC_LOCAL_API_TOKEN: 'local-only-value' },
    });
    expect(store.profile).toBe('staging');
    expect(store.get('adminPassword').reveal()).toBe(VALUE);
    expect(store.find('apiToken')?.reveal()).toBe(`${VALUE}-staging`);
    expect(store.find('basicAuth')).toBeUndefined();
    expect(store.has('basicAuth')).toBe(false);
    expect(store.names()).toEqual(['adminPassword', 'apiToken']);
    expect(Object.isFrozen(store)).toBe(true);
    expect(Object.isFrozen(store.names())).toBe(true);
  });

  test('a per-profile secret does not exist in profiles its map leaves out', () => {
    const store = loadSecrets(def, { profile: 'qa', env: { QAC_ADMIN_PASSWORD: VALUE } });
    expect(store.find('apiToken')).toBeUndefined();
    expect(store.names()).toEqual(['adminPassword']);
  });

  test('reads process.env by default', () => {
    process.env.QAC_ADMIN_PASSWORD = VALUE;
    try {
      expect(loadSecrets(def, { profile: 'qa' }).get('adminPassword').reveal()).toBe(VALUE);
    } finally {
      delete process.env.QAC_ADMIN_PASSWORD;
    }
  });

  test('reports every problem at once, by secret and variable name, never by value', () => {
    const shortValue = 'xyz';
    const error = secretsError(() =>
      loadSecrets(
        defineSecrets({
          missing: { env: 'QAC_MISSING' },
          empty: { env: 'QAC_EMPTY' },
          short: { env: 'QAC_SHORT' },
          perProfileMissing: { env: { local: 'QAC_LOCAL_TOKEN' } },
          emptyMap: { env: {} },
          valuePastedAsName: { env: 'hunter2-pasted-value' },
        }),
        { profile: 'local', env: { QAC_EMPTY: '', QAC_SHORT: shortValue } },
      ),
    );
    expect(error.profile).toBe('local');
    expect(error.issues).toEqual([
      { secret: 'missing', variable: 'QAC_MISSING', message: 'is not set' },
      { secret: 'empty', variable: 'QAC_EMPTY', message: 'is empty' },
      { secret: 'short', variable: 'QAC_SHORT', message: expect.stringContaining(`shorter than ${MIN_SECRET_LENGTH} characters`) },
      { secret: 'perProfileMissing', variable: 'QAC_LOCAL_TOKEN', message: 'is not set' },
      { secret: 'emptyMap', message: expect.stringContaining('env map is empty') },
      { secret: 'valuePastedAsName', message: expect.stringContaining('invalid environment variable name') },
    ]);
    expect(error.message).toContain('Missing or invalid QA Cortex secrets (profile "local"):');
    expect(error.message).toContain('  - missing: environment variable QAC_MISSING is not set');
    expect(error.message).not.toContain(shortValue);
    expect(error.message).not.toContain('hunter2-pasted-value');
    expect(String(error.stack)).not.toContain('hunter2-pasted-value');
    // Non-enumerable details, so runners print the message once.
    expect(Object.keys(error)).toEqual(['name']);
  });

  test('optional secrets may be unset; allowShort accepts short values', () => {
    const store = loadSecrets(defineSecrets({ pin: { env: 'QAC_PIN', allowShort: true }, opt: { env: 'QAC_OPT', optional: true } }), {
      profile: 'local',
      env: { QAC_PIN: '1234'.slice(0, 3) },
    });
    expect(store.get('pin').reveal()).toBe('123');
    expect(store.find('opt')).toBeUndefined();
  });

  test('the short-value limit matches the logger (shorter values are not redacted there)', () => {
    expect(MIN_SECRET_LENGTH).toBe(4);
    const ok = loadSecrets(defineSecrets({ s: { env: 'QAC_S' } }), { profile: 'local', env: { QAC_S: 'abcd' } });
    expect(ok.get('s').reveal()).toBe('abcd');
  });

  test('rejects a missing or empty profile', () => {
    // @ts-expect-error profile is required
    expect(() => loadSecrets(def, {})).toThrow(SecretsError);
    expect(secretsError(() => loadSecrets(def, { profile: ' ' })).issues[0]?.message).toContain('profile must be a non-empty string');
  });

  test('get() of a secret that is not available throws and points to find()', () => {
    const store = loadSecrets(def, { profile: 'local', env: { QAC_ADMIN_PASSWORD: VALUE, QAC_LOCAL_API_TOKEN: VALUE } });
    const untyped = store as unknown as { get(name: string): Secret };
    expect(secretsError(() => untyped.get('basicAuth')).issues[0]?.message).toContain('read it with find()');
    expect(secretsError(() => untyped.get('nope')).issues[0]?.message).toContain('not defined in defineSecrets()');
  });

  test('the store exposes no list of raw values', () => {
    const store = loadSecrets(def, { profile: 'local', env: { QAC_ADMIN_PASSWORD: VALUE, QAC_LOCAL_API_TOKEN: VALUE } });
    expect(Object.keys(store).sort()).toEqual(['find', 'get', 'has', 'names', 'profile']);
    expect(JSON.stringify(store)).not.toContain(VALUE);
    expect(inspect(store, { depth: 5 })).not.toContain(VALUE);
  });
});

test.describe('Secret', () => {
  const secret = new Secret('adminPassword', VALUE);

  test('reveal() is the only way to the value', () => {
    expect(secret.reveal()).toBe(VALUE);
    expect(secret.name).toBe('adminPassword');
    expect(Object.isFrozen(secret)).toBe(true);
  });

  test('String(), templates, concatenation, JSON and util.inspect show [REDACTED]', () => {
    expect(String(secret)).toBe('[REDACTED]');
    // Type-aware lint flags a Secret in a template or `+` (useful in user code); here it is the point of the check.
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    expect(`${secret}`).toBe('[REDACTED]');
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    expect('x' + secret).toBe('x[REDACTED]');
    expect(JSON.stringify({ secret })).toBe('{"secret":"[REDACTED]"}');
    expect(inspect(secret)).toBe('Secret(adminPassword) [REDACTED]');
    expect(inspect({ nested: [secret] }, { depth: 5 })).not.toContain(VALUE);
    expect(Object.entries(secret)).toEqual([['name', 'adminPassword']]);
  });

  test('the logger never writes the value of a Secret object', () => {
    const records: LogRecord[] = [];
    createLogger({ sink: (r) => records.push(r) }).info(`using ${String(secret)}`, { secret, password: secret, list: [secret] });
    const written = JSON.stringify(records);
    expect(written).not.toContain(VALUE);
    expect(records[0]?.msg).toBe(`using ${REDACTED}`);
  });
});
