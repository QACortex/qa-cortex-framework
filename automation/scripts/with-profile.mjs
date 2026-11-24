// Cross-platform helper: runs `playwright test` with QA_CORTEX_PROFILE set.
// Usage: node scripts/with-profile.mjs <profile> [extra playwright args]
// (npm scripts run in cmd.exe on Windows, where `VAR=value cmd` does not work.)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const [profile, ...args] = process.argv.slice(2);
if (!profile) {
  console.error('usage: node scripts/with-profile.mjs <profile> [playwright args]');
  process.exit(2);
}

const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
console.log(`> QA_CORTEX_PROFILE=${profile} playwright test ${args.join(' ')}`.trimEnd());

const child = spawn(process.execPath, [cli, 'test', ...args], {
  stdio: 'inherit',
  env: { ...process.env, QA_CORTEX_PROFILE: profile },
});
child.on('exit', (code) => process.exit(code ?? 1));
