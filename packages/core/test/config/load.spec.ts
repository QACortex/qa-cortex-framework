// loadConfig() behaviour (ported from spike S2, adapted to QA_CORTEX_PROFILE and the
// single-signature defineConfig). Runs against the built package through its public name.
import { expect, test } from '@playwright/test';
import {
  ConfigError,
  DEFAULT_PROFILE,
  PROFILE_ENV_VAR,
  RESERVED_NAMESPACES,
  coreSchema,
  defineConfig,
  isReservedNamespace,
  loadConfig,
  z,
} from '@qa-cortex/core/config';

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
  } catch (error) {
    if (error instanceof ConfigError) return error;
    throw error;
  }
  throw new Error('expected a ConfigError');
}

test.describe('precedence: defaults → base → profile → overrides', () => {
  test('schema defaults fill gaps, including nested defaults (prefault)', () => {
    expect(loadConfig(def, noEnv)).toEqual({
      baseURL: 'http://localhost:3000',
      production: false,
      timeouts: { action: 10_000, navigation: 30_000 },
      profile: 'local',
    });
  });

  test('profile overrides base; a partial nested overlay keeps the other defaults', () => {
    const cfg = loadConfig(def, { ...noEnv, profile: 'staging' });
    expect(cfg.baseURL).toBe('https://staging.example.test');
    expect(cfg.timeouts).toEqual({ action: 5_000, navigation: 30_000 });
  });

  test('overrides win over the profile', () => {
    const cfg = loadConfig(def, { ...noEnv, profile: 'staging', overrides: { timeouts: { action: 1 } } });
    expect(cfg.timeouts).toEqual({ action: 1, navigation: 30_000 });
  });

  test('loading is deterministic and leaves the definition untouched', () => {
    const before = structuredClone(def.profiles);
    expect(loadConfig(def, { ...noEnv, profile: 'staging' })).toEqual(loadConfig(def, { ...noEnv, profile: 'staging' }));
    expect(def.profiles).toEqual(before);
    expect(Object.isFrozen(def.profiles.staging)).toBe(false); // output is frozen, user input is not
  });
});

test.describe('profile selection', () => {
  test(`uses ${PROFILE_ENV_VAR} and defaults to "${DEFAULT_PROFILE}"`, () => {
    expect(PROFILE_ENV_VAR).toBe('QA_CORTEX_PROFILE');
    expect(loadConfig(def, { env: { QA_CORTEX_PROFILE: 'staging' } }).profile).toBe('staging');
    expect(loadConfig(def, noEnv).profile).toBe('local');
  });

  test('precedence: option > QA_CORTEX_PROFILE > defaultProfile > "local"', () => {
    expect(loadConfig(def, { profile: 'prod', env: { QA_CORTEX_PROFILE: 'staging' } }).profile).toBe('prod');
    expect(loadConfig({ ...def, defaultProfile: 'prod' }, { env: { QA_CORTEX_PROFILE: 'staging' } }).profile).toBe('staging');
    expect(loadConfig({ ...def, defaultProfile: 'prod' }, noEnv).profile).toBe('prod');
  });

  test('the old QA_PROFILE variable from the spike is not read', () => {
    expect(loadConfig(def, { env: { QA_PROFILE: 'staging' } }).profile).toBe('local');
  });

  test('a blank variable is ignored and whitespace is trimmed', () => {
    expect(loadConfig(def, { env: { QA_CORTEX_PROFILE: '  ' } }).profile).toBe('local');
    expect(loadConfig(def, { env: { QA_CORTEX_PROFILE: ' staging ' } }).profile).toBe('staging');
  });

  test('reads process.env when no env is passed', () => {
    const previous = process.env.QA_CORTEX_PROFILE;
    process.env.QA_CORTEX_PROFILE = 'prod';
    try {
      expect(loadConfig(def).profile).toBe('prod');
    } finally {
      if (previous === undefined) delete process.env.QA_CORTEX_PROFILE;
      else process.env.QA_CORTEX_PROFILE = previous;
    }
  });

  test('an unknown profile lists the known ones and says where the name came from', () => {
    const err = catchConfigError(() => loadConfig(def, { env: { QA_CORTEX_PROFILE: 'stagng' } }));
    expect(err.message).toContain('unknown profile "stagng". Known profiles: local, staging, prod');
    expect(err.issues[0]?.source).toBe('env QA_CORTEX_PROFILE');
    expect(catchConfigError(() => loadConfig(def, { env: {}, profile: 'x' })).issues[0]?.source).toBe('loadConfig options');
  });

  test('inherited object keys are not profiles', () => {
    expect(() => loadConfig(def, { ...noEnv, profile: 'toString' })).toThrow(/unknown profile "toString"/);
  });
});

test.describe('validation errors', () => {
  test('all issues are reported at once, each with the layer that caused it', () => {
    const bad = defineConfig({
      // @ts-expect-error deliberate typo, to exercise the unknown-key path at runtime
      base: { timeouts: { action: 5_000 }, baseURl: 'http://x.test' },
      profiles: { staging: { timeouts: { action: -1 } } },
    });
    const err = catchConfigError(() => loadConfig(bad, { ...noEnv, profile: 'staging' }));
    expect(err.issues).toEqual([
      { path: 'baseURL', message: expect.stringContaining('expected string') as unknown, source: 'not set in base, profile "staging"' },
      { path: 'timeouts.action', message: expect.stringContaining('>0') as unknown, source: 'profile "staging"' },
      { path: 'baseURl', message: expect.stringContaining('unknown key') as unknown, source: 'base' },
    ]);
    expect(err.message.split('\n')[0]).toBe('Invalid QA Cortex config (profile "staging"):');
  });

  test('nested typos are caught (strict objects at every depth)', () => {
    // @ts-expect-error deliberate nested typo
    const typo = defineConfig({ base: { baseURL: 'http://x.test' }, profiles: { local: { timeouts: { actoin: 1 } } } });
    const err = catchConfigError(() => loadConfig(typo, noEnv));
    expect(err.issues).toEqual([expect.objectContaining({ path: 'timeouts.actoin', source: 'profile "local"' })]);
  });

  test('messages never echo config values (they may be secrets)', () => {
    const leaky = defineConfig({ base: { baseURL: 'hunter2-SECRET-not-a-url' }, profiles: { local: {} } });
    const err = catchConfigError(() => loadConfig(leaky, noEnv));
    expect(err.message).not.toContain('SECRET');
    expect(JSON.stringify(err.issues)).not.toContain('SECRET');
    expect(err.issues[0]).toMatchObject({ path: 'baseURL', source: 'base' });
  });

  test('issues and profile are readable but not enumerable (no duplicate dumps in reports)', () => {
    const err = catchConfigError(() => loadConfig(def, { ...noEnv, profile: 'nope' }));
    expect(err.profile).toBe('nope');
    expect(err.issues).toHaveLength(1);
    expect(Object.keys(err)).not.toContain('issues');
    expect(Object.isFrozen(err.issues)).toBe(true);
  });

  test('async refinements are rejected loudly (loading must stay synchronous)', () => {
    const asyncSchema = coreSchema.extend({ app: z.string().refine(async () => Promise.resolve(true)) });
    const d = defineConfig({ schema: asyncSchema, base: { baseURL: 'http://x.test', app: 'a' }, profiles: { local: {} } });
    expect(() => loadConfig(d, noEnv)).toThrow(/async|Promise/i);
  });

  test('"profile" is reserved for the selected profile name', () => {
    const clash = coreSchema.extend({ profile: z.string().default('mine') });
    const d = defineConfig({ schema: clash, base: { baseURL: 'http://x.test' }, profiles: { local: {} } });
    const err = catchConfigError(() => loadConfig(d, noEnv));
    expect(err.issues).toEqual([expect.objectContaining({ path: 'profile', source: 'schema' })]);
  });
});

test.describe('immutable result', () => {
  test('plain objects and arrays are deep-frozen; class instances are left untouched', () => {
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

  test('mutation attempts throw (ES modules run in strict mode)', () => {
    const cfg = loadConfig(def, noEnv);
    expect(() => {
      (cfg as { baseURL: string }).baseURL = 'http://evil.test';
    }).toThrow(TypeError);
    expect(() => {
      (cfg.timeouts as { action: number }).action = 1;
    }).toThrow(TypeError);
    expect(cfg.baseURL).toBe('http://localhost:3000');
  });
});

test.describe('reserved namespaces (api, ai)', () => {
  test('RESERVED_NAMESPACES matches the placeholders in coreSchema', () => {
    expect(RESERVED_NAMESPACES).toEqual(['api', 'ai']);
    expect(Object.isFrozen(RESERVED_NAMESPACES)).toBe(true);
    for (const key of RESERVED_NAMESPACES) expect(Object.keys(coreSchema.shape)).toContain(key);
    expect(isReservedNamespace('api')).toBe(true);
    expect(isReservedNamespace('baseURL')).toBe(false);
    expect(isReservedNamespace('API')).toBe(false);
  });

  test('core accepts anything under api/ai without validating it', () => {
    const cfg = loadConfig(
      defineConfig({ base: { baseURL: 'http://x.test', api: { anything: [1, 'two'] }, ai: 42 }, profiles: { local: {} } }),
      noEnv,
    );
    expect(cfg.api).toEqual({ anything: [1, 'two'] });
    expect(cfg.ai).toBe(42);
  });

  test('an extension replaces a reserved namespace with a real schema, with provenance', () => {
    const apiSchema = z.strictObject({ baseURL: z.url(), retries: z.number().int().min(0).default(0) });
    const schema = coreSchema.extend({ api: apiSchema });
    const d = defineConfig({ schema, base: { baseURL: 'http://x.test', api: { baseURL: 'http://api.x.test' } }, profiles: { local: {} } });
    expect(loadConfig(d, noEnv).api).toEqual({ baseURL: 'http://api.x.test', retries: 0 });
    const err = catchConfigError(() => loadConfig({ ...d, profiles: { local: { api: { retries: -1 } } } }, noEnv));
    expect(err.issues).toEqual([expect.objectContaining({ path: 'api.retries', source: 'profile "local"' })]);
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
