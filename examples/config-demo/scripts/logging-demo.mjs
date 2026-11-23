// Runs the logging demo with a fresh SYNTHETIC secret (not a real credential).
//   node scripts/logging-demo.mjs success   -> tests/logging.spec.ts, expected exit code 0
//   node scripts/logging-demo.mjs failure   -> tests/failure/ only,  expected exit code 1
// The secret's value is never printed. It is `demo-synthetic-` plus 12 hex digits, so you can
// search the terminal and HTML report for /demo-synthetic-[0-9a-f]{12}/: you should find no
// match, only [REDACTED] in the QA Cortex log output. (A trace may show the bare prefix inside
// its copy of the tests/fixtures.ts source; that is code, not the secret.)
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

const mode = process.argv[2];
if (mode !== 'success' && mode !== 'failure') {
  console.error('usage: node scripts/logging-demo.mjs <success|failure>');
  process.exit(2);
}

const secret = `demo-synthetic-${randomBytes(6).toString('hex')}`;
/** @type {NodeJS.ProcessEnv} */
const env = { ...process.env, QA_CORTEX_PROFILE: 'local', QAC_DEMO_SECRET: secret };
const args = ['test'];
if (mode === 'success') {
  args.push('tests/logging.spec.ts');
  delete env.QAC_DEMO_FAILURE;
} else {
  env.QAC_DEMO_FAILURE = '1';
}

console.log(`> logging demo (${mode}), profile=local`);
console.log('> a fresh synthetic secret was generated for this run (value not shown); it should appear only as [REDACTED]');
if (mode === 'failure') console.log('> INTENTIONAL FAILURE: one test fails on purpose; exit code 1 is expected.');

const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
const child = spawn(process.execPath, [cli, ...args], { stdio: 'inherit', env });
child.on('exit', (code) => {
  if (mode === 'failure') {
    console.log(code === 1 ? '> failure demo finished with exit code 1, as expected.' : `> unexpected exit code ${code} (expected 1).`);
  }
  console.log('> open the report: npm run report');
  process.exit(code ?? 1);
});
