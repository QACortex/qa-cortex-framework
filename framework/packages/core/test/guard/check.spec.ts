// @qa-cortex/core/guard: checkProductionSafety(), assertProductionSafe(), ProductionGuardError.
// Unit tests against the built package; no browser.
import { defineConfig, expect, test } from '@playwright/test';
import { ProductionGuardError, assertProductionSafe, checkProductionSafety, type GuardViolation } from '@qa-cortex/core/guard';

const safe = { trace: 'off', video: 'off', screenshot: 'off' } as const;
const settings = (violations: readonly GuardViolation[]): string[] => violations.map((v) => `${v.project ?? '(root)'}:${v.setting}=${v.found}:${v.severity}`);

test.describe('checkProductionSafety()', () => {
  test('not production: nothing is checked', () => {
    expect(checkProductionSafety(defineConfig({ use: { trace: 'on', video: 'on', screenshot: 'on' }, reporter: 'html' }), { production: false })).toEqual([]);
  });

  test('defaults (unset) and explicit "off" are safe', () => {
    expect(checkProductionSafety(defineConfig({}), { production: true })).toEqual([]);
    expect(checkProductionSafety(defineConfig({ use: safe, reporter: [['list'], ['junit', { outputFile: 'r.xml' }]] }), { production: true })).toEqual([]);
  });

  test('every recording trace and video mode is an error, string or object form', () => {
    for (const mode of ['on', 'retain-on-failure', 'on-first-retry', 'on-all-retries', 'retain-on-first-failure'] as const) {
      expect(settings(checkProductionSafety({ use: { ...safe, trace: mode } }, { production: true })), mode).toEqual([`(root):trace=${mode}:error`]);
      expect(settings(checkProductionSafety({ use: { ...safe, video: { mode } } }, { production: true })), mode).toEqual([`(root):video=${mode}:error`]);
    }
    expect(settings(checkProductionSafety({ use: { ...safe, trace: { mode: 'off', snapshots: true } } }, { production: true }))).toEqual([]);
  });

  test('screenshots: "on" is an error; failure-only needs allowScreenshotsOnFailure', () => {
    expect(settings(checkProductionSafety({ use: { ...safe, screenshot: 'on' } }, { production: true }))).toEqual(['(root):screenshot=on:error']);
    expect(settings(checkProductionSafety({ use: { ...safe, screenshot: 'only-on-failure' } }, { production: true }))).toEqual([
      '(root):screenshot=only-on-failure:error',
    ]);
    for (const mode of ['only-on-failure', 'on-first-failure']) {
      expect(checkProductionSafety({ use: { ...safe, screenshot: { mode } } }, { production: true, allowScreenshotsOnFailure: true }), mode).toEqual([]);
    }
    expect(settings(checkProductionSafety({ use: { ...safe, screenshot: 'on' } }, { production: true, allowScreenshotsOnFailure: true }))).toEqual([
      '(root):screenshot=on:error',
    ]);
  });

  test('unknown or malformed modes fail closed', () => {
    expect(settings(checkProductionSafety({ use: { ...safe, trace: 'some-future-mode' } }, { production: true }))).toEqual(['(root):trace=some-future-mode:error']);
    expect(settings(checkProductionSafety({ use: { ...safe, video: { size: { width: 1, height: 1 } } } }, { production: true }))).toEqual([
      '(root):video=(unrecognised value):error',
    ]);
    expect(settings(checkProductionSafety({ use: { ...safe, trace: true } }, { production: true }))).toEqual(['(root):trace=(unrecognised value):error']);
  });

  test('projects: each project is checked with its use applied over the root use', () => {
    const config = defineConfig({
      use: { trace: 'on' },
      projects: [{ name: 'overrides', use: { trace: 'off' } }, { name: 'inherits' }, { name: 'video', use: { trace: 'off', video: 'on' } }, {}],
    });
    expect(settings(checkProductionSafety(config, { production: true }))).toEqual(['inherits:trace=on:error', 'video:video=on:error', '#4:trace=on:error']);
  });

  test('reporters: HTML and blob warn by default; error or ignore on request', () => {
    const config = defineConfig({ use: safe, reporter: [['list'], ['html', { open: 'never' }], ['blob']] });
    expect(settings(checkProductionSafety(config, { production: true }))).toEqual(['(root):reporter=html:warning', '(root):reporter=blob:warning']);
    expect(settings(checkProductionSafety(config, { production: true, reporters: 'error' }))).toEqual(['(root):reporter=html:error', '(root):reporter=blob:error']);
    expect(checkProductionSafety(config, { production: true, reporters: 'ignore' })).toEqual([]);
    expect(settings(checkProductionSafety({ use: safe, reporter: 'html' }, { production: true }))).toEqual(['(root):reporter=html:warning']);
  });

  test('never changes the config', () => {
    const config = defineConfig({ use: { trace: 'on' }, projects: [{ name: 'a' }], reporter: 'html' });
    const before = JSON.stringify(config);
    checkProductionSafety(config, { production: true });
    expect(JSON.stringify(config)).toBe(before);
  });
});

test.describe('assertProductionSafe()', () => {
  test('throws one ProductionGuardError listing every error', () => {
    const config = defineConfig({ use: { trace: 'on', video: 'retain-on-failure' }, projects: [{ name: 'chromium' }] });
    let error: unknown;
    try {
      assertProductionSafe(config, { production: true, warn: () => undefined });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ProductionGuardError);
    const guardError = error as ProductionGuardError;
    expect(guardError.message).toBe(
      [
        'QA Cortex production guard: this production run would record artifacts that can contain secrets (ADR 0003).',
        '  - project "chromium": trace is "on"; production requires "off"',
        '  - project "chromium": video is "retain-on-failure"; production requires "off"',
      ].join('\n'),
    );
    expect(guardError.violations).toHaveLength(2);
    expect(Object.keys(guardError)).toEqual(['name']);
  });

  test('warnings go to options.warn and do not throw', () => {
    const warnings: string[] = [];
    assertProductionSafe(defineConfig({ use: safe, reporter: 'html' }), { production: true, warn: (m) => warnings.push(m) });
    expect(warnings).toEqual(['QA Cortex production guard: reporter "html" is configured; production expects no HTML or blob reporter (they embed screenshots and traces)']);
  });

  test('not production: never throws or warns', () => {
    const warnings: string[] = [];
    assertProductionSafe(defineConfig({ use: { trace: 'on' }, reporter: 'html' }), { production: false, warn: (m) => warnings.push(m) });
    expect(warnings).toEqual([]);
  });
});
