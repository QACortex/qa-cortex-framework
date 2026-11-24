// CI preset demo: runs the profile-driven smoke and logging tests with QA_CORTEX_PRESET=ci, the
// same reporters and artifact settings a CI run gets, then lists the report files it produced.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
const args = ['test', 'tests/ui/site.spec.ts', 'tests/ui/logging.spec.ts'];

console.log(`> QA_CORTEX_PRESET=ci playwright ${args.join(' ')}`);
const child = spawn(process.execPath, [cli, ...args], { stdio: 'inherit', env: { ...process.env, QA_CORTEX_PRESET: 'ci' } });
child.on('exit', (code) => {
  for (const file of ['reports/junit.xml', 'playwright-report/index.html']) {
    console.log(`> ${file}: ${existsSync(file) ? 'written' : 'missing'}`);
  }
  process.exit(code ?? 1);
});
