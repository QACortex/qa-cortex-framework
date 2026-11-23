// configFixtures(): runs a nested Playwright project (test/fixtures/pw-fixtures) with two
// projects and two workers, and checks what the fixtures do under Playwright's own runner.
import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { runNestedPlaywright } from '../helpers/nested-playwright.js';

const projectDir = join(import.meta.dirname, '..', 'fixtures', 'pw-fixtures');
const TESTS_PER_PROJECT = 7; // 4 shared-config + 1 dependent fixture + 1 mergeTests + 1 test.use

test.describe('configFixtures()', () => {
  test.describe.configure({ timeout: 90_000 });

  test('provides qaConfig per worker, honours qaProfile per project, composes with extend/mergeTests', async ({}, testInfo) => {
    const { code, output } = await runNestedPlaywright(projectDir, {}, testInfo.outputPath('nested'));
    expect(output).toContain(`${TESTS_PER_PROJECT * 2} passed`);
    expect(code).toBe(0);
    expect(output).toMatch(/QAC_FIXTURE project=env-profile worker=\d+ profile=local loads=1/);
    expect(output).toMatch(/QAC_FIXTURE project=staging worker=\d+ profile=staging loads=1/);
    // More than one worker took part, and each loaded the config once.
    const workers = new Set([...output.matchAll(/QAC_FIXTURE project=\S+ worker=(\d+)/g)].map((m) => m[1]));
    expect(workers.size).toBeGreaterThan(1);
  });

  test('QA_CORTEX_PROFILE applies when the project sets no qaProfile', async ({}, testInfo) => {
    const { code, output } = await runNestedPlaywright(projectDir, { QA_CORTEX_PROFILE: 'staging' }, testInfo.outputPath('nested'));
    expect(output).toContain(`${TESTS_PER_PROJECT * 2} passed`);
    expect(code).toBe(0);
    expect(output).toMatch(/QAC_FIXTURE project=env-profile worker=\d+ profile=staging loads=1/);
  });

  test('an unknown profile fails the tests with a readable ConfigError', async ({}, testInfo) => {
    const { code, output } = await runNestedPlaywright(projectDir, { QA_CORTEX_PROFILE: 'stagng' }, testInfo.outputPath('nested'));
    expect(code).not.toBe(0);
    expect(output).toContain('ConfigError: Invalid QA Cortex config (profile "stagng"):');
    expect(output).toContain('unknown profile "stagng". Known profiles: local, staging [env QA_CORTEX_PROFILE]');
    // Projects that set qaProfile explicitly are unaffected by the bad variable.
    expect(output).toMatch(/QAC_FIXTURE project=staging worker=\d+ profile=staging loads=1/);
  });
});
