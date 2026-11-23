// Regression: with configFixtures(), Playwright's `baseURL` and `qaConfig` must resolve to the
// same selected profile when the project follows the documented pattern (ADR 0006). Runs the
// nested project in test/fixtures/pw-baseurl; no browser is started.
import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { runNestedPlaywright } from '../helpers/nested-playwright.js';

const projectDir = join(import.meta.dirname, '..', 'fixtures', 'pw-baseurl');

test.describe('configFixtures(): baseURL and qaConfig alignment', () => {
  test.describe.configure({ timeout: 90_000 });

  test('default profile and a qaProfile project both align', async ({}, testInfo) => {
    const { code, output } = await runNestedPlaywright(projectDir, {}, testInfo.outputPath('nested'));
    expect(output).toContain('2 passed');
    expect(code).toBe(0);
    expect(output).toContain('QAC_ALIGN project=env-profile qaProfile=- profile=local qaConfig.baseURL=http://localhost:3000 baseURL=http://localhost:3000');
    expect(output).toContain(
      'QAC_ALIGN project=staging qaProfile=staging profile=staging qaConfig.baseURL=https://staging.example.test baseURL=https://staging.example.test',
    );
  });

  test('QA_CORTEX_PROFILE moves baseURL and qaConfig together', async ({}, testInfo) => {
    const { code, output } = await runNestedPlaywright(projectDir, { QA_CORTEX_PROFILE: 'staging' }, testInfo.outputPath('nested'));
    expect(output).toContain('2 passed');
    expect(code).toBe(0);
    expect(output).toContain(
      'QAC_ALIGN project=env-profile qaProfile=- profile=staging qaConfig.baseURL=https://staging.example.test baseURL=https://staging.example.test',
    );
  });

  test('the check detects a project whose baseURL comes from a different profile', async ({}, testInfo) => {
    const { code, output } = await runNestedPlaywright(projectDir, { QAC_ALIGN_NEGATIVE: '1' }, testInfo.outputPath('nested'));
    expect(code).not.toBe(0);
    expect(output).toContain('1 failed');
    expect(output).toContain('2 passed'); // the aligned projects still pass
    expect(output).toContain('[misaligned]');
    expect(output).toContain('Playwright baseURL must come from the profile qaConfig loaded');
  });
});
