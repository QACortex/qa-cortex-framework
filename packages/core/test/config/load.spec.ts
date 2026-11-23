// loadConfig() behaviour (ported from spike S2, adapted to QA_CORTEX_PROFILE and the
// single-signature defineQaConfig). Runs against the built package through its public name.
import { expect, test } from '@playwright/test';
import {
  ConfigError,
  DEFAULT_PROFILE,
  PROFILE_ENV_VAR,
  RESERVED_NAMESPACES,
  coreSchema,
  defineQaConfig,
  isReservedNamespace,
  loadConfig,
  z,
} from '@qa-cortex/core/config';

// A project-style extension with a nested object that has defaults, used to cover nested
// defaults (prefault), nested overlays, nested errors and nested freezing. coreSchema itself
// has no nested defaults any more (ADR 0002 addendum: no Playwright settings in core).
const schema = coreSchema.extend({
  app: z
    .strictObject({
      tenant: z.string().default('acme'),
      pageSize: z.number().int().positive().default(25),
    })
    .prefault({}),
});

const def = defineQaConfig({
  schema,
  base: { baseURL: 'http://localhost:3000' },
  profiles: {
    local: {},
    staging: { baseURL: 'https://staging.example.test', app: { pageSize: 50 } },
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
      app: { tenant: 'acme', pageSize: 25 },
      profile: 'local',
    });
  });

  test('the core schema alone yields only core fields', () => {
    const core = defineQaConfig({ base: { baseURL: 'http://localhost:3000' }, profiles: { local: {} } });
    expect(loadConfig(core, noEnv)).toEqual({ baseURL: 'http://localhost:3000', production: false, profile: 'local' });
  });

  test('profile overrides base; a partial nested overlay keeps the other defaults', () => {
    const cfg = loadConfig(def, { ...noEnv, profile: 'staging' });
    expect(cfg.baseURL).toBe('https://staging.example.test');
    expect(cfg.app).toEqual({ tenant: 'acme', pageSize: 50 });
  });

  test('overrides win over the profile', () => {
    const cfg = loadConfig(def, { ...noEnv, profile: 'staging', overrides: { app: { pageSize: 1 } } });
    expect(cfg.app).toEqual({ tenant: 'acme', pageSize: 1 });
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
    const bad = defineQaConfig({
      schema,
      // @ts-expect-error deliberate typo, to exercise the unknown-key path at runtime
      base: { app: { pageSize: 25 }, baseURl: 'http://x.test' },
      profiles: { staging: { app: { pageSize: -1 } } },
    });
    const err = catchConfigError(() => loadConfig(bad, { ...noEnv, profile: 'staging' }));
    expect(err.issues).toEqual([
      { path: 'baseURL', message: expect.stringContaining('expected string') as unknown, source: 'not set in base, profile "staging"' },
      { path: 'app.pageSize', message: expect.stringContaining('>0') as unknown, source: 'profile "staging"' },
      { path: 'baseURl', message: expect.stringContaining('unknown key') as unknown, source: 'base' },
    ]);
    expect(err.message.split('\n')[0]).toBe('Invalid QA Cortex config (profile "staging"):');
  });

  test('nested typos are caught (strict objects at every depth)', () => {
    // @ts-expect-error deliberate nested typo
    const typo = defineQaConfig({ schema, base: { baseURL: 'http://x.test' }, profiles: { local: { app: { pagesize: 1 } } } });
    const err = catchConfigError(() => loadConfig(typo, noEnv));
    expect(err.issues).toEqual([expect.objectContaining({ path: 'app.pagesize', source: 'profile "local"' })]);
  });

  test('timeouts is not part of the core schema (Playwright owns timeouts)', () => {
    // @ts-expect-error removed from coreSchema before release
    const legacy = defineQaConfig({ base: { baseURL: 'http://x.test', timeouts: { action: 5_000 } }, profiles: { local: {} } });
    const err = catchConfigError(() => loadConfig(legacy, noEnv));
    expect(err.issues).toEqual([expect.objectContaining({ path: 'timeouts', message: expect.stringContaining('unknown key'), source: 'base' })]);
  });

  test('an unknown key holding an object names every layer that set it', () => {
    // Regression: provenance records leaves, so an object-valued unknown key used to report
    // "not set in ..." even though base and the profile had both set it.
    const withExtra = defineQaConfig({
      // @ts-expect-error unknown root key holding an object
      base: { baseURL: 'http://x.test', extra: { a: 1 } },
      // @ts-expect-error same unknown key in the profile
      profiles: { local: { extra: { b: 2 } } },
    });
    const err = catchConfigError(() => loadConfig(withExtra, noEnv));
    expect(err.issues).toEqual([expect.objectContaining({ path: 'extra', source: 'base, profile "local"' })]);
  });

  test('messages never echo config values (they may be secrets)', () => {
    const leaky = defineQaConfig({ base: { baseURL: 'hunter2-SECRET-not-a-url' }, profiles: { local: {} } });
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
    const asyncSchema = coreSchema.extend({ tag: z.string().refine(async () => Promise.resolve(true)) });
    const d = defineQaConfig({ schema: asyncSchema, base: { baseURL: 'http://x.test', tag: 'a' }, profiles: { local: {} } });
    expect(() => loadConfig(d, noEnv)).toThrow(/async|Promise/i);
  });

  test('"profile" is reserved for the selected profile name', () => {
    const clash = coreSchema.extend({ profile: z.string().default('mine') });
    const d = defineQaConfig({ schema: clash, base: { baseURL: 'http://x.test' }, profiles: { local: {} } });
    const err = catchConfigError(() => loadConfig(d, noEnv));
    expect(err.issues).toEqual([expect.objectContaining({ path: 'profile', source: 'schema' })]);
  });
});

test.describe('immutable result', () => {
  test('plain objects and arrays are deep-frozen; class instances are left untouched', () => {
    const withData = coreSchema.extend({ data: z.strictObject({ tags: z.array(z.string()), started: z.date() }) });
    const started = new Date(0);
    const cfg = loadConfig(
      defineQaConfig({ schema: withData, base: { baseURL: 'http://x.test', data: { tags: ['a'], started } }, profiles: { local: {} } }),
      noEnv,
    );
    expect(Object.isFrozen(cfg)).toBe(true);
    expect(Object.isFrozen(cfg.data)).toBe(true);
    expect(Object.isFrozen(cfg.data.tags)).toBe(true);
    expect(cfg.data.started).toBe(started);
    expect(Object.isFrozen(cfg.data.started)).toBe(false);
  });

  test('mutation attempts throw (ES modules run in strict mode)', () => {
    const cfg = loadConfig(def, noEnv);
    expect(() => {
      (cfg as { baseURL: string }).baseURL = 'http://evil.test';
    }).toThrow(TypeError);
    expect(() => {
      (cfg.app as { pageSize: number }).pageSize = 1;
    }).toThrow(TypeError);
    expect(cfg.baseURL).toBe('http://localhost:3000');
    expect(cfg.app.pageSize).toBe(25);
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
      defineQaConfig({ base: { baseURL: 'http://x.test', api: { anything: [1, 'two'] }, ai: 42 }, profiles: { local: {} } }),
      noEnv,
    );
    expect(cfg.api).toEqual({ anything: [1, 'two'] });
    expect(cfg.ai).toBe(42);
  });

  test('an extension replaces a reserved namespace with a real schema, with provenance', () => {
    const apiSchema = z.strictObject({ baseURL: z.url(), retries: z.number().int().min(0).default(0) });
    const withApi = coreSchema.extend({ api: apiSchema });
    const d = defineQaConfig({ schema: withApi, base: { baseURL: 'http://x.test', api: { baseURL: 'http://api.x.test' } }, profiles: { local: {} } });
    expect(loadConfig(d, noEnv).api).toEqual({ baseURL: 'http://api.x.test', retries: 0 });
    const err = catchConfigError(() => loadConfig({ ...d, profiles: { local: { api: { retries: -1 } } } }, noEnv));
    expect(err.issues).toEqual([expect.objectContaining({ path: 'api.retries', source: 'profile "local"' })]);
  });

  test('extending keeps the root strict', () => {
    const withTenant = coreSchema.extend({ tenant: z.string() });
    const err = catchConfigError(() =>
      loadConfig(
        // @ts-expect-error unknown root key
        defineQaConfig({ schema: withTenant, base: { baseURL: 'http://x.test', tenant: 't', extra: 1 }, profiles: { local: {} } }),
        noEnv,
      ),
    );
    expect(err.issues.map((i) => i.path)).toEqual(['extra']);
  });
});
