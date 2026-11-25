// One-command setup for a fresh clone: `npm run setup` (any shell, any OS).
//
// Runs the documented setup steps in order, and nothing else:
//   1. npm run framework:pack                     build ../framework, write vendor/qa-cortex-core.tgz
//                                                 (skipped outside the repository when the tarball is already there)
//   2. npm install file:vendor/qa-cortex-core.tgz  install this project's dependencies and the framework package
//   3. copy .env.example to .env                   only if .env does not exist; an existing .env is never touched
//   4. npx playwright install <browsers>           default: chromium. Others: npm run setup -- firefox webkit
//
// It prints no secret values (.env.example holds placeholders only). Linux needs the browsers'
// system libraries once: npx playwright install-deps (uses sudo).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('Run this through npm: npm run setup');
  process.exit(2);
}
const browsers = process.argv.slice(2);
/** Runs one step; on failure names the step and exits with the step's own exit code (never 0). */
const run = (/** @type {string} */ label, /** @type {string[]} */ args) => {
  console.log(`\n> ${label}`);
  try {
    execFileSync(process.execPath, args, { cwd: dir, stdio: 'inherit' });
  } catch (e) {
    const status = /** @type {{ status?: number | null }} */ (e).status;
    const code = typeof status === 'number' && status !== 0 ? status : 1;
    console.error(`\nSetup failed at: ${label} (exit code ${code}). See the output above; later steps were not run.`);
    process.exit(code);
  }
};

const insideRepo = existsSync(join(dir, '..', 'framework', 'packages', 'core', 'package.json'));
const tarball = join(dir, 'vendor', 'qa-cortex-core.tgz');
if (insideRepo) run('npm run framework:pack', [npmCli, 'run', 'framework:pack']);
else if (existsSync(tarball)) console.log('\n> framework/ not found: using the existing vendor/qa-cortex-core.tgz');
else {
  console.error('framework/ not found and no vendor/qa-cortex-core.tgz: copy a @qa-cortex/core tarball there first (see vendor/README.md).');
  process.exit(1);
}

run('npm install file:vendor/qa-cortex-core.tgz', [npmCli, 'install', '--no-audit', '--no-fund', 'file:vendor/qa-cortex-core.tgz']);

const env = join(dir, '.env');
if (existsSync(env)) console.log('\n> .env exists: kept as it is');
else {
  copyFileSync(join(dir, '.env.example'), env);
  console.log('\n> created .env from .env.example (placeholders; replace them with your own values)');
}

const cli = createRequire(join(dir, 'package.json')).resolve('@playwright/test/cli');
const list = browsers.length > 0 ? browsers : ['chromium'];
run(`npx playwright install ${list.join(' ')}`, [cli, 'install', ...list]);

console.log('\nSetup complete. Next: npm test');
