import { expect, test } from '@playwright/test';
import { ConfigError, coreSchema, defineConfig, loadConfig, z } from '../src/config/index.js';

const def = defineConfig({
  base: { baseURL: 'http://localhost:3000' },
  profiles: {
    local: {},
    staging: { baseURL: 'https://staging.example.test', timeouts: { action: 5_000 } },
    prod: { baseURL: 'https://example.com', production: true },
  },
});

const noEnv = { env: {} };

function catchConfigError(fn: () => unknown): ConfigError {
  try {
    fn();
  } catch (e) {
    if (e instanceof ConfigError) return e;
    throw e;
  }
  throw new Error('expected ConfigError');
}

test.describe('defaults and layering', () => {
  test('schema defaults fill gaps, including nested defaults via prefault', () => {
    const cfg = loadConfig(def, noEnv);
    expect(cfg).toEqual({
      baseURL: 'http://localhost:3000',
      production: false,
      timeouts: { action: 10_000, navigation: 30_000 },
      profile: 'local',
    });
  });

  test('profile overlays base; partial nested overlay keeps other defaults', () => {
    const cfg = loadConfig(def, { ...noEnv, profile: 'staging' });
    expect(cfg.baseURL).toBe('https://staging.example.test');
    expect(cfg.timeouts).toEqual({ action: 5_000, navigation: 30_000 });
  });

  test('overrides win over profile', () => {
    const cfg = loadConfig(def, { ...noEnv, profile: 'staging', overrides: { timeouts: { action: 1 } } });
    expect(cfg.timeouts.action).toBe(1);
  });

  test('loading is deterministic and leaves the definition untouched', () => {
    const before = structuredClone(def.profiles);
    expect(loadConfig(def, { ...noEnv, profile: 'staging' })).toEqual(loadConfig(def, { ...noEnv, profile: 'staging' }));
    expect(def.profiles).toEqual(before);
    expect(Object.isFrozen(def.profiles.staging)).toBe(false); // we freeze our output, not user input
  });
});

test.describe('profile selection', () => {
  test('precedence: option > QA_PROFILE > defaultProfile > "local"', () => {
    expect(loadConfig(def, { profile: 'prod', env: { QA_PROFILE: 'staging' } }).profile).toBe('prod');
    expect(loadConfig(def, { env: { QA_PROFILE: 'staging' } }).profile).toBe('staging');
    expect(loadConfig({ ...def, defaultProfile: 'prod' }, noEnv).profile).toBe('prod');
    expect(loadConfig(def, noEnv).profile).toBe('local');
  });

  test('blank QA_PROFILE is ignored; whitespace trimmed', () => {
    expect(loadConfig(def, { env: { QA_PROFILE: '  ' } }).profile).toBe('local');
    expect(loadConfig(def, { env: { QA_PROFILE: ' staging ' } }).profile).toBe('staging');
  });

  test('unknown profile lists the known ones and says where the name came from', () => {
    const err = catchConfigError(() => loadConfig(def, { env: { QA_PROFILE: 'stagng' } }));
    expect(err.message).toContain('unknown profile "stagng". Known profiles: local, staging, prod');
    expect(err.issues[0]?.source).toBe('env QA_PROFILE');
  });

  test('inherited object keys are not profiles', () => {
    expect(() => loadConfig(def, { ...noEnv, profile: 'toString' })).toThrow(/unknown profile "toString"/);
  });
});

test.describe('validation errors', () => {
  const bad = defineConfig({
    base: { timeouts: { action: 5_000 } },
    profiles: { staging: { timeouts: { action: -1 } } },
  });

  test('all issues reported at once, each with its source layer', () => {
    const err = catchConfigError(() =>
      loadConfig(
        {
          ...bad,
          // @ts-expect-error deliberate typo to exercise the unknown-key path
          base: { ...bad.base, baseURl: 'http://x.test' },
        },
        { ...noEnv, profile: 'staging' },
      ),
    );
    expect(err.issues).toEqual([
      { path: 'baseURL', message: expect.stringContaining('expected string'), source: 'not set in base, profile "staging"' },
      { path: 'timeouts.action', message: expect.stringContaining('>0'), source: 'profile "staging"' },
      { path: 'baseURl', message: expect.stringContaining('unknown key'), source: 'base' },
    ]);
    console.log(`\n${err.message}\n`); // printed so the ADR can quote the real output
  });

  test('nested typos are caught too (strict nested objects)', () => {
    const err = catchConfigError(() =>
      // @ts-expect-error deliberate nested typo
      loadConfig({ ...def, profiles: { local: { timeouts: { actoin: 1 } } } }, noEnv),
    );
    expect(err.issues).toEqual([expect.objectContaining({ path: 'timeouts.actoin', source: 'profile "local"' })]);
  });

  test('error messages never echo values (they may be secrets)', () => {
    const err = catchConfigError(() =>
      loadConfig({ ...def, profiles: { local: { baseURL: 'hunter2-SECRET-not-a-url' } } }, noEnv),
    );
    expect(err.message).not.toContain('SECRET');
    expect(err.issues[0]).toMatchObject({ path: 'baseURL', source: 'profile "local"' });
  });

  test('async refinements are rejected loudly (loading must stay sync)', () => {
    const asyncSchema = coreSchema.extend({ app: z.string().refine(async () => true) });
    const d = defineConfig({ schema: asyncSchema, base: { baseURL: 'http://x.test', app: 'a' }, profiles: { local: {} } });
    expect(() => loadConfig(d, noEnv)).toThrow(/async|Promise/i);
  });
});

test.describe('result', () => {
  test('is deep-frozen (plain objects and arrays), class instances untouched', () => {
    const schema = coreSchema.extend({ app: z.strictObject({ tags: z.array(z.string()), started: z.date() }) });
    const started = new Date(0);
    const cfg = loadConfig(
      defineConfig({ schema, base: { baseURL: 'http://x.test', app: { tags: ['a'], started } }, profiles: { local: {} } }),
      noEnv,
    );
    expect(Object.isFrozen(cfg)).toBe(true);
    expect(Object.isFrozen(cfg.app)).toBe(true);
    expect(Object.isFrozen(cfg.app.tags)).toBe(true);
    expect(cfg.app.started).toBe(started);
    expect(Object.isFrozen(cfg.app.started)).toBe(false);
  });
});

test.describe('schema extension and reserved namespaces', () => {
  test('core accepts anything under api/ai without validating it', () => {
    const cfg = loadConfig(
      defineConfig({ base: { baseURL: 'http://x.test', api: { anything: [1, 'two'] }, ai: 42 }, profiles: { local: {} } }),
      noEnv,
    );
    expect(cfg.api).toEqual({ anything: [1, 'two'] });
    expect(cfg.ai).toBe(42);
  });

  test('an extension replaces a reserved namespace with a real schema', () => {
    const apiSchema = z.strictObject({ baseURL: z.url(), retries: z.number().int().min(0).default(0) });
    const schema = coreSchema.extend({ api: apiSchema });
    const d = defineConfig({ schema, base: { baseURL: 'http://x.test', api: { baseURL: 'http://api.x.test' } }, profiles: { local: {} } });
    expect(loadConfig(d, noEnv).api).toEqual({ baseURL: 'http://api.x.test', retries: 0 });

    const err = catchConfigError(() =>
      loadConfig({ ...d, profiles: { local: { api: { retries: -1 } } } }, noEnv),
    );
    expect(err.issues.map((i) => i.path)).toEqual(['api.retries']);
  });

  test('extending keeps the root strict', () => {
    const schema = coreSchema.extend({ app: z.strictObject({ tenant: z.string() }) });
    const err = catchConfigError(() =>
      loadConfig(
        // @ts-expect-error unknown root key
        defineConfig({ schema, base: { baseURL: 'http://x.test', app: { tenant: 't' }, extra: 1 }, profiles: { local: {} } }),
        noEnv,
      ),
    );
    expect(err.issues.map((i) => i.path)).toEqual(['extra']);
  });
});
