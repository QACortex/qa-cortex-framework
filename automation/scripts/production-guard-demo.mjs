// Production guard demo: an UNSAFE production run is stopped. Exit code 1 is EXPECTED.
//
// Runs the (simulated) production profile with `--trace on` added on the command line.
// playwright.config.ts is production-safe, so its static check passes; the CLI flag is caught
// at run time by the qaProductionGuard fixture, which fails the worker before a browser starts.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
const args = ['test', '--project=chromium', 'tests/ui/site.spec.ts', '--trace', 'on'];

console.log(`> QA_CORTEX_PROFILE=production playwright ${args.join(' ')}`);
console.log('> INTENTIONAL BLOCK: --trace on in a production run; ProductionGuardError and exit code 1 are expected.');

const child = spawn(process.execPath, [cli, ...args], { stdio: 'inherit', env: { ...process.env, QA_CORTEX_PROFILE: 'production' } });
child.on('exit', (code) => {
  console.log(code === 1 ? '> production guard demo finished with exit code 1, as expected.' : `> unexpected exit code ${code} (expected 1).`);
  process.exit(code ?? 1);
});
