// Compatibility with Playwright's own configuration: runs a real, nested Playwright project
// (test/fixtures/pw-project) whose playwright.config.ts calls loadConfig() and passes the
// result to workers through a standard option fixture.
import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { runNestedPlaywright, type NestedRunResult } from '../helpers/nested-playwright.js';

const projectDir = join(import.meta.dirname, '..', 'fixtures', 'pw-project');

function runNested(env: Record<string, string>, outputDir: string): Promise<NestedRunResult> {
  return runNestedPlaywright(projectDir, env, outputDir);
}

test.describe('Playwright configuration compatibility', () => {
  test.describe.configure({ timeout: 90_000 });

  test('loadConfig() in playwright.config.ts feeds workers via a plain option fixture', async ({}, testInfo) => {
    const { code, output } = await runNested({}, testInfo.outputPath('nested'));
    expect(output).toContain('6 passed');
    expect(code).toBe(0);
    expect(output).toContain('QAC_RESULT env-profile profile=local baseURL=http://localhost:3000');
    expect(output).toContain('QAC_RESULT staging profile=staging baseURL=https://staging.example.test');
  });

  test('QA_CORTEX_PROFILE selects the profile for the whole run', async ({}, testInfo) => {
    const { code, output } = await runNested({ QA_CORTEX_PROFILE: 'staging' }, testInfo.outputPath('nested'));
    expect(output).toContain('6 passed');
    expect(code).toBe(0);
    expect(output).toContain('QAC_RESULT env-profile profile=staging baseURL=https://staging.example.test');
  });

  test('an unknown profile fails fast in the main process with a readable ConfigError', async ({}, testInfo) => {
    const { code, output } = await runNested({ QA_CORTEX_PROFILE: 'stagng' }, testInfo.outputPath('nested'));
    expect(code).not.toBe(0);
    expect(output).toContain('ConfigError: Invalid QA Cortex config (profile "stagng"):');
    expect(output).toContain('unknown profile "stagng". Known profiles: local, staging [env QA_CORTEX_PROFILE]');
    expect(output).not.toContain('QAC_RESULT'); // no test ran
    expect(output).not.toMatch(/issues:\s*\[/); // non-enumerable: no raw dump after the message
  });
});
