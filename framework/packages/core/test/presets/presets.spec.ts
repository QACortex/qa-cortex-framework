// @qa-cortex/core/presets: selectPreset(), qaPreset(), artifactPresets, PresetError.
// Unit tests against the built package; no browser.
import { expect, test } from '@playwright/test';
import { PRESET_ENV_VAR, PresetError, artifactPresets, qaPreset, selectPreset, type PresetName } from '@qa-cortex/core/presets';

/** Run fn and return the PresetError's problems. */
function problems(fn: () => unknown): readonly string[] {
  try {
    fn();
  } catch (error) {
    if (error instanceof PresetError) return error.problems;
    throw error;
  }
  throw new Error('expected a PresetError');
}

const noEnv = {};

test.describe('selectPreset()', () => {
  test('production profile → production; CI → ci; otherwise local', () => {
    expect(selectPreset({ production: true, env: noEnv })).toBe('production');
    expect(selectPreset({ production: true, ci: true, env: noEnv })).toBe('production');
    expect(selectPreset({ production: false, env: { CI: '1' } })).toBe('ci');
    expect(selectPreset({ production: false, ci: true, env: noEnv })).toBe('ci');
    expect(selectPreset({ production: false, ci: false, env: { CI: '1' } })).toBe('local');
    expect(selectPreset({ production: false, env: noEnv })).toBe('local');
  });

  test(`${PRESET_ENV_VAR} chooses a preset, never weaker than production`, () => {
    expect(selectPreset({ production: false, env: { [PRESET_ENV_VAR]: 'ci' } })).toBe('ci');
    expect(selectPreset({ production: false, env: { [PRESET_ENV_VAR]: ' production ', CI: '1' } })).toBe('production');
    expect(selectPreset({ production: false, ci: true, env: { [PRESET_ENV_VAR]: 'local' } })).toBe('local');
    expect(selectPreset({ production: true, env: { [PRESET_ENV_VAR]: 'production' } })).toBe('production');
    expect(problems(() => selectPreset({ production: true, env: { [PRESET_ENV_VAR]: 'local' } }))).toEqual([
      `${PRESET_ENV_VAR}="local" is not allowed for a production profile: production runs always use the "production" preset`,
    ]);
    expect(problems(() => selectPreset({ production: false, env: { [PRESET_ENV_VAR]: 'staging' } }))[0]).toContain('is not a preset');
    expect(selectPreset({ production: false, env: { [PRESET_ENV_VAR]: '' } })).toBe('local');
  });

  test('reads process.env by default', () => {
    const before = process.env[PRESET_ENV_VAR];
    process.env[PRESET_ENV_VAR] = 'ci';
    try {
      expect(selectPreset({ production: false })).toBe('ci');
    } finally {
      if (before === undefined) delete process.env[PRESET_ENV_VAR];
      else process.env[PRESET_ENV_VAR] = before;
    }
  });
});

test.describe('presets', () => {
  test('artifact settings per preset (ADR 0003, ADR 0009)', () => {
    expect(artifactPresets).toEqual({
      local: { trace: 'retain-on-failure', video: 'retain-on-failure', screenshot: 'only-on-failure' },
      ci: { trace: 'retain-on-failure', video: 'off', screenshot: 'only-on-failure' },
      production: { trace: 'off', video: 'off', screenshot: 'off' },
    });
    expect(Object.isFrozen(artifactPresets)).toBe(true);
    expect(Object.isFrozen(artifactPresets.production)).toBe(true);
  });

  test('reporters per preset', () => {
    expect(qaPreset('local', { env: noEnv }).reporter).toEqual([['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]);
    expect(qaPreset('ci', { env: noEnv }).reporter).toEqual([['dot'], ['html', { open: 'never', outputFolder: 'playwright-report' }], ['junit', { outputFile: 'reports/junit.xml' }]]);
    expect(qaPreset('ci', { env: { GITHUB_ACTIONS: 'true' } }).reporter[0]).toEqual(['github']);
    expect(qaPreset('production', { env: noEnv }).reporter).toEqual([['list'], ['junit', { outputFile: 'reports/junit.xml' }]]);
  });

  test('result: name, frozen use, fresh copy every call', () => {
    const a = qaPreset('ci', { env: noEnv });
    const b = qaPreset('ci', { env: noEnv });
    expect(a.name).toBe('ci');
    expect(a.use).toEqual(artifactPresets.ci);
    expect(Object.isFrozen(a.use)).toBe(true);
    expect(a.reporter).not.toBe(b.reporter);
    a.reporter.push(['line']);
    expect(qaPreset('ci', { env: noEnv }).reporter).toHaveLength(3);
  });

  test('an unknown preset name is rejected', () => {
    expect(problems(() => qaPreset('staging' as PresetName))[0]).toContain('"staging" is not a preset');
  });
});

test.describe('overrides', () => {
  test('artifacts: individual settings replace the preset values; undefined is ignored', () => {
    expect(qaPreset('ci', { artifacts: { video: 'on-first-retry', trace: undefined } }).use).toEqual({
      trace: 'retain-on-failure',
      video: 'on-first-retry',
      screenshot: 'only-on-failure',
    });
  });

  test('html and junit: options merge over the preset, false drops, absent reporters are added', () => {
    expect(qaPreset('ci', { env: noEnv, reporters: { html: { outputFolder: 'html-report', open: 'on-failure' }, junit: false } }).reporter).toEqual([
      ['dot'],
      ['html', { open: 'on-failure', outputFolder: 'html-report' }],
    ]);
    expect(qaPreset('local', { env: noEnv, reporters: { html: false, junit: { outputFile: 'reports/local.xml' } } }).reporter).toEqual([
      ['list'],
      ['junit', { outputFile: 'reports/local.xml' }],
    ]);
  });

  test('json: off by default, true or options add it', () => {
    expect(qaPreset('local', { env: noEnv }).reporter.some((d) => d[0] === 'json')).toBe(false);
    expect(qaPreset('local', { env: noEnv, reporters: { json: true } }).reporter.at(-1)).toEqual(['json', { outputFile: 'reports/results.json' }]);
    expect(qaPreset('local', { env: noEnv, reporters: { json: { outputFile: 'out/r.json' } } }).reporter.at(-1)).toEqual(['json', { outputFile: 'out/r.json' }]);
  });

  test('precedence: preset list → html/junit options → json → extra, in that order', () => {
    const preset = qaPreset('ci', {
      env: noEnv,
      reporters: { junit: { includeRetries: true }, json: true, extra: [['allure-playwright', { resultsDir: 'allure-results' }], ['./my-reporter.ts']] },
    });
    expect(preset.reporter.map((d) => d[0])).toEqual(['dot', 'html', 'junit', 'json', 'allure-playwright', './my-reporter.ts']);
    expect(preset.reporter[2]).toEqual(['junit', { outputFile: 'reports/junit.xml', includeRetries: true }]);
  });

  test('replace is the whole list and cannot be combined with other reporter options', () => {
    expect(qaPreset('ci', { env: noEnv, reporters: { replace: [['line'], ['junit', { outputFile: 'reports/x.xml' }]] } }).reporter).toEqual([
      ['line'],
      ['junit', { outputFile: 'reports/x.xml' }],
    ]);
    expect(problems(() => qaPreset('ci', { reporters: { replace: [['line']], junit: false, extra: [['dot']] } }))).toEqual([
      'reporters.replace cannot be combined with reporters.junit, reporters.extra: put every reporter in the replace list',
    ]);
  });

  test('a built-in reporter may appear only once', () => {
    expect(problems(() => qaPreset('ci', { env: noEnv, reporters: { extra: [['html', { outputFolder: 'other' }]] } }))).toContainEqual(
      'reporter "html" appears more than once; configure it once (reporters.html or one list entry)',
    );
  });

  test('malformed reporter entries are reported, not passed on', () => {
    const bad = [42, { reporter: 'html' }] as unknown as [];
    expect(problems(() => qaPreset('local', { reporters: { extra: bad } }))).toEqual([
      "reporters.extra[0]: expected a Playwright reporter description such as ['junit', { outputFile: 'reports/junit.xml' }]",
      "reporters.extra[1]: expected a Playwright reporter description such as ['junit', { outputFile: 'reports/junit.xml' }]",
    ]);
  });
});

test.describe('production reporter rules (same for extra and replace)', () => {
  test('console, JUnit and JSON reporters need no approval', () => {
    expect(qaPreset('production', { env: noEnv, reporters: { json: true, extra: [['dot']] } }).reporter.map((d) => d[0])).toEqual(['list', 'junit', 'json', 'dot']);
    expect(qaPreset('production', { reporters: { replace: [['github'], ['junit', { outputFile: 'reports/p.xml' }]] } }).reporter.map((d) => d[0])).toEqual([
      'github',
      'junit',
    ]);
  });

  test('a third-party reporter needs allowInProduction, in extra and in replace alike', () => {
    for (const reporters of [{ extra: [['allure-playwright']] as const }, { replace: [['list'], ['allure-playwright']] as const }]) {
      expect(problems(() => qaPreset('production', { env: noEnv, reporters }))).toEqual([
        'reporter "allure-playwright" needs { reporter: [...], allowInProduction: true } in the production preset: reporters other than the console, JUnit and JSON ones may copy screenshots, traces or test output into their own results',
      ]);
    }
    const approved = { reporter: ['allure-playwright', { resultsDir: 'allure-results' }], allowInProduction: true } as const;
    expect(qaPreset('production', { env: noEnv, reporters: { extra: [approved] } }).reporter.at(-1)).toEqual(['allure-playwright', { resultsDir: 'allure-results' }]);
    expect(qaPreset('production', { reporters: { replace: [['list'], approved] } }).reporter).toHaveLength(2);
  });

  test('html and blob are never allowed in production, even when approved', () => {
    expect(problems(() => qaPreset('production', { reporters: { html: { open: 'never' } } }))).toEqual([
      'reporters.html: the HTML reporter is not allowed in the production preset (it packages screenshots, videos and traces)',
    ]);
    for (const reporter of ['html', 'blob'] as const) {
      const entry = { reporter: [reporter] as const, allowInProduction: true };
      expect(problems(() => qaPreset('production', { reporters: { extra: [entry] } }))[0]).toContain(`reporter "${reporter}" is not allowed in the production preset, even with allowInProduction`);
      expect(problems(() => qaPreset('production', { reporters: { replace: [entry] } }))[0]).toContain(`reporter "${reporter}" is not allowed in the production preset`);
    }
  });

  test('approvals are ignored outside production', () => {
    expect(qaPreset('local', { env: noEnv, reporters: { extra: [{ reporter: ['blob'], allowInProduction: true }] } }).reporter.at(-1)).toEqual(['blob']);
  });
});

test.describe('report output paths', () => {
  test('defaults stay out of outputDir and the HTML folder', () => {
    for (const name of ['local', 'ci', 'production'] as const) expect(() => qaPreset(name, { reporters: { json: true } })).not.toThrow();
  });

  test('a report file inside outputDir or the HTML folder is rejected', () => {
    expect(problems(() => qaPreset('ci', { env: noEnv, reporters: { junit: { outputFile: 'test-results/junit.xml' } } }))).toEqual([
      'reporter "junit" outputFile "test-results/junit.xml" is inside outputDir "test-results", which Playwright clears at the start of every run',
    ]);
    expect(problems(() => qaPreset('ci', { env: noEnv, outputDir: 'out', reporters: { json: { outputFile: './out/sub/r.json' } } }))[0]).toContain('is inside outputDir "out"');
    expect(problems(() => qaPreset('ci', { env: noEnv, reporters: { json: { outputFile: 'playwright-report/results.json' } } }))).toEqual([
      'reporter "json" outputFile "playwright-report/results.json" is inside the HTML report folder "playwright-report", which the HTML reporter replaces',
    ]);
    expect(problems(() => qaPreset('local', { env: noEnv, reporters: { extra: [['allure-playwright', { resultsDir: 'test-results/allure' }]] } }))[0]).toContain(
      'reporter "allure-playwright" resultsDir "test-results/allure" is inside outputDir',
    );
  });

  test('an HTML folder overlapping outputDir is rejected', () => {
    expect(problems(() => qaPreset('local', { env: noEnv, reporters: { html: { outputFolder: 'test-results/html' } } }))).toEqual([
      'HTML report folder "test-results/html" and outputDir "test-results" overlap; keep them apart',
    ]);
    expect(problems(() => qaPreset('local', { env: noEnv, outputDir: 'playwright-report/out' }))[0]).toContain('overlap');
  });

  test('two reporters writing the same file are rejected', () => {
    expect(problems(() => qaPreset('ci', { env: noEnv, reporters: { json: { outputFile: 'reports/junit.xml' } } }))).toEqual([
      'reporter "json" outputFile "reports/junit.xml" is also written by reporter "junit"',
    ]);
  });

  test('every problem is reported at once', () => {
    const list = problems(() =>
      qaPreset('production', { env: noEnv, reporters: { html: {}, junit: { outputFile: 'test-results/j.xml' }, extra: [['allure-playwright']] } }),
    );
    expect(list).toHaveLength(3);
  });
});
