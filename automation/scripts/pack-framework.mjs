// Inside the qa-cortex repository only: builds ../framework and packs @qa-cortex/core into
// vendor/qa-cortex-core.tgz, the file this project depends on until the package is published.
//
//   npm run framework:pack      then   npm install
//
// Outside the repository, put a @qa-cortex/core tarball at vendor/qa-cortex-core.tgz yourself.
// The file name has no version on purpose, so package.json never needs to change.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const automationDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frameworkDir = resolve(automationDir, '..', 'framework');
const target = join(automationDir, 'vendor', 'qa-cortex-core.tgz');

/**
 * @param {string} text
 * @returns {unknown}
 */
const parseJson = (text) => JSON.parse(text);

if (!existsSync(join(frameworkDir, 'packages', 'core', 'package.json'))) {
  console.error(
    `framework/ not found next to automation/ (looked in ${frameworkDir}).\n` +
      'This script only works inside the qa-cortex repository. Otherwise, place a\n' +
      '@qa-cortex/core tarball at vendor/qa-cortex-core.tgz and run npm install.',
  );
  process.exit(1);
}

// Use the npm that runs this script, so no shell is needed on any OS.
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('Run this through npm: npm run framework:pack');
  process.exit(2);
}
const npm = (/** @type {string[]} */ args) =>
  execFileSync(process.execPath, [npmCli, ...args], { cwd: frameworkDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

if (!existsSync(join(frameworkDir, 'node_modules'))) {
  console.log('> framework: npm ci');
  npm(['ci', '--no-audit', '--no-fund']);
}
console.log('> framework: npm run build');
npm(['run', 'build']);

const packDir = mkdtempSync(join(tmpdir(), 'qac-pack-'));
try {
  console.log('> framework: npm pack @qa-cortex/core');
  const [pack] = /** @type {{ filename: string; name: string; version: string }[]} */ (
    parseJson(npm(['pack', '--workspace', '@qa-cortex/core', '--pack-destination', packDir, '--json']))
  );
  if (!pack) throw new Error('npm pack returned no result');
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(packDir, pack.filename), target);
  console.log(`> wrote vendor/qa-cortex-core.tgz (${pack.name}@${pack.version}, ${(statSync(target).size / 1024).toFixed(1)} kB)`);
  console.log('> next: npm install   (updates package-lock.json if the package contents changed)');
} finally {
  rmSync(packDir, { recursive: true, force: true });
}
