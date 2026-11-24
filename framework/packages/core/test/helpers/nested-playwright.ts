// Runs a nested Playwright project (under test/fixtures/) in a child process.
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const playwrightCli = createRequire(import.meta.url).resolve('@playwright/test/cli');

export interface NestedRunResult {
  code: number;
  output: string;
}

/**
 * Runs `playwright test` for the project in `projectDir` with a clean environment: the outer
 * runner's worker variables, loader hooks and any QA_CORTEX_* values must not leak in.
 */
export function runNestedPlaywright(projectDir: string, env: Record<string, string>, outputDir: string, args: readonly string[] = []): Promise<NestedRunResult> {
  const clean = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^(TEST_|PW_|PLAYWRIGHT_|NODE_OPTIONS$|QA_CORTEX_)/.test(key)),
  );
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [playwrightCli, 'test', '-c', join(projectDir, 'playwright.config.ts'), ...args],
      { cwd: projectDir, env: { ...clean, ...env, QAC_NESTED_OUTPUT: outputDir }, timeout: 60_000 },
      (error, stdout, stderr) => resolve({ code: error ? Number(error.code ?? 1) : 0, output: `${stdout}\n${stderr}` }),
    );
  });
}
