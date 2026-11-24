// Production guard under Playwright's own runner (nested project test/fixtures/pw-guard).
// Proves the runtime guard sees CLI flags and test.use(), and fails the worker BEFORE a browser
// launches: the blocked runs request `page`, and no browser is installed in framework CI.
import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { runNestedPlaywright } from '../helpers/nested-playwright.js';
import { readZip } from '../helpers/zip.js';

const projectDir = join(import.meta.dirname, '..', 'fixtures', 'pw-guard');
// pw:api logs every browser API call, so a launch attempt would show up in the output.
const DEBUG = { DEBUG: 'pw:api' };

async function filesIn(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir, { recursive: true })).map((f) => f.replaceAll('\\', '/'));
  } catch {
    return [];
  }
}

/** Assert a run was blocked by the guard before any browser work. */
async function expectBlocked(run: { code: number; output: string }, outputDir: string, reason: string, runnerTraces = 0): Promise<void> {
  expect(run.code).not.toBe(0);
  expect(run.output).toContain('ProductionGuardError: QA Cortex production guard');
  expect(run.output).toContain(reason);
  expect(run.output, 'no browser launch was attempted').not.toContain('browserType.launch');
  expect(run.output).not.toContain("Executable doesn't exist");
  const files = await filesIn(outputDir);
  expect(files.filter((f) => /\.(webm|png|jpe?g)$/.test(f)), 'no video or screenshot').toEqual([]);
  // Known limitation: with trace on, Playwright still writes a test-runner trace for the
  // blocked test. It holds no browser data: only test.trace (hooks, output, error) and sources.
  const traces = files.filter((f) => f.endsWith('trace.zip'));
  expect(traces, 'test-runner traces written for the blocked test').toHaveLength(runnerTraces);
  for (const zip of traces) {
    const names = readZip(await readFile(join(outputDir, zip))).map((e) => e.name);
    expect(names.filter((n) => n !== 'test.trace' && !n.startsWith('src')), `${zip} holds no browser data`).toEqual([]);
  }
}

test.describe('productionGuardFixtures() and assertProductionSafe()', () => {
  test.describe.configure({ timeout: 90_000 });

  test('production with safe settings: the worker runs', async ({}, testInfo) => {
    const run = await runNestedPlaywright(projectDir, { QA_CORTEX_PROFILE: 'production', QAC_GUARD_STATIC: '1' }, testInfo.outputPath('nested'), [
      'nopage.spec.ts',
    ]);
    expect(run.output).toContain('QAC_GUARD_RAN profile=production production=true');
    expect(run.output).toContain('1 passed');
    expect(run.code).toBe(0);
  });

  test('CLI --trace on is blocked at run time, before the browser launches', async ({}, testInfo) => {
    const outputDir = testInfo.outputPath('nested');
    const run = await runNestedPlaywright(projectDir, { QA_CORTEX_PROFILE: 'production', QAC_GUARD_STATIC: '1', ...DEBUG }, outputDir, [
      'browser.spec.ts',
      '--trace',
      'on',
    ]);
    await expectBlocked(run, outputDir, 'trace is "on"; production requires "off"', 1);
  });

  test('test.use({ trace: "on" }) is blocked at run time, before the browser launches', async ({}, testInfo) => {
    const outputDir = testInfo.outputPath('nested');
    const run = await runNestedPlaywright(projectDir, { QA_CORTEX_PROFILE: 'production', ...DEBUG }, outputDir, ['use-trace.spec.ts']);
    await expectBlocked(run, outputDir, 'trace is "on"; production requires "off"', 1);
  });

  test('control: without a block, the same debug output shows the browser launch', async ({}, testInfo) => {
    // Not production, so the guard lets browser.spec.ts through and Playwright tries to launch a
    // browser. Whether it succeeds depends on installed browsers; the attempt is what matters.
    const run = await runNestedPlaywright(projectDir, { QA_CORTEX_PROFILE: 'local', ...DEBUG }, testInfo.outputPath('nested'), ['browser.spec.ts']);
    expect(run.output).toContain('browserType.launch');
    expect(run.output).not.toContain('ProductionGuardError');
  });

  test('CLI --reporter html reaches the fixture (reporters: "error")', async ({}, testInfo) => {
    const outputDir = testInfo.outputPath('nested');
    const run = await runNestedPlaywright(
      projectDir,
      {
        QA_CORTEX_PROFILE: 'production',
        QAC_GUARD_REPORTERS: 'error',
        PLAYWRIGHT_HTML_OUTPUT_DIR: testInfo.outputPath('html'),
        PLAYWRIGHT_HTML_OPEN: 'never',
        ...DEBUG,
      },
      outputDir,
      ['browser.spec.ts', '--reporter', 'list,html'],
    );
    await expectBlocked(run, outputDir, 'reporter "html" is configured');
  });

  test('static check: an unsafe config stops the run before any test starts', async ({}, testInfo) => {
    const run = await runNestedPlaywright(
      projectDir,
      { QA_CORTEX_PROFILE: 'production', QAC_GUARD_STATIC: '1', QAC_GUARD_CONFIG_TRACE: 'on', ...DEBUG },
      testInfo.outputPath('nested'),
      ['nopage.spec.ts'],
    );
    expect(run.code).not.toBe(0);
    expect(run.output).toContain('ProductionGuardError: QA Cortex production guard');
    expect(run.output).toContain('trace is "on"; production requires "off"');
    expect(run.output).not.toContain('QAC_GUARD_RAN');
    expect(run.output).not.toMatch(/\d+ passed/);
  });

  test('not production: --trace on is allowed', async ({}, testInfo) => {
    const run = await runNestedPlaywright(projectDir, { QA_CORTEX_PROFILE: 'local', QAC_GUARD_STATIC: '1' }, testInfo.outputPath('nested'), [
      'nopage.spec.ts',
      '--trace',
      'on',
    ]);
    expect(run.output).toContain('QAC_GUARD_RAN profile=local production=false');
    expect(run.code).toBe(0);
  });
});
