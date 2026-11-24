// Presets under Playwright's own runner: what each preset actually writes, and where.
// The nested project (test/fixtures/pw-presets) is copied into this test's output folder and
// run there, so the presets' default, relative report paths are used exactly as shipped.
import { expect, test } from '@playwright/test';
import { cp, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { runNestedPlaywright } from '../helpers/nested-playwright.js';

const template = join(import.meta.dirname, '..', 'fixtures', 'pw-presets');

async function files(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir, { recursive: true })).map((f) => f.replaceAll('\\', '/')).sort();
  } catch {
    return [];
  }
}

async function run(testInfo: { outputPath: (...p: string[]) => string }, env: Record<string, string>) {
  const dir = testInfo.outputPath('project');
  await cp(template, dir, { recursive: true });
  // QAC_NESTED_OUTPUT is ignored by this config on purpose: outputDir is the preset-relevant "test-results".
  const result = await runNestedPlaywright(dir, env, join(dir, 'unused'));
  return { ...result, dir, all: await files(dir) };
}

test.describe('presets under the Playwright runner', () => {
  test.describe.configure({ timeout: 90_000 });

  test('ci: JUnit in reports/, HTML report not opened, trace kept for the failed test only', async ({}, testInfo) => {
    const r = await run(testInfo, { QA_CORTEX_PRESET: 'ci' });
    expect(r.output).toMatch(/QAC_PRESET name=ci reporters=(dot|github),html,junit/);
    expect(r.code).toBe(1); // the deliberate failure; the run finished (an opened HTML report would hang)
    expect(r.all).toContain('reports/junit.xml');
    expect(r.all).toContain('playwright-report/index.html');
    const traces = r.all.filter((f) => f.endsWith('trace.zip'));
    expect(traces).toHaveLength(1);
    expect(traces[0]).toMatch(/^test-results\/.*fails-on-purpose.*\/trace\.zip$/);
    expect(r.all.filter((f) => f.startsWith('test-results/') && f.includes('junit'))).toEqual([]);
  });

  test('local: HTML report, no JUnit, trace kept for the failed test only', async ({}, testInfo) => {
    const r = await run(testInfo, { QA_CORTEX_PRESET: 'local' });
    expect(r.output).toContain('QAC_PRESET name=local reporters=list,html');
    expect(r.code).toBe(1);
    expect(r.all).toContain('playwright-report/index.html');
    expect(r.all.some((f) => f.startsWith('reports/'))).toBe(false);
    expect(r.all.filter((f) => f.endsWith('trace.zip'))).toHaveLength(1);
  });

  test('production profile: guard passes; JUnit only; no trace, video, screenshot, HTML or blob output', async ({}, testInfo) => {
    const r = await run(testInfo, { QAC_PRODUCTION: '1' });
    expect(r.output).toContain('QAC_PRESET name=production reporters=list,junit');
    expect(r.output).not.toContain('ProductionGuardError');
    expect(r.code).toBe(1);
    expect(r.all).toContain('reports/junit.xml');
    expect(r.all.filter((f) => /trace\.zip$|\.webm$|\.png$|^playwright-report\/|^blob-report\//.test(f))).toEqual([]);
  });

  test('production profile: QA_CORTEX_PRESET cannot pick a weaker preset', async ({}, testInfo) => {
    const r = await run(testInfo, { QAC_PRODUCTION: '1', QA_CORTEX_PRESET: 'local' });
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('PresetError: Invalid QA Cortex preset options:');
    expect(r.output).toContain('QA_CORTEX_PRESET="local" is not allowed for a production profile');
    expect(r.all.filter((f) => f.startsWith('reports/') || f.startsWith('playwright-report/'))).toEqual([]);
  });
});
