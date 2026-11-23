// Validates what `npm pack` would publish for @qa-cortex/core, without publishing anything.
// Fails (exit 1) if an `exports` target is missing from the tarball, if LICENSE or
// package.json is missing, or if build caches, tests or node_modules would be published.
// Run after `npm run build`:  npm run pack:check
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const WORKSPACE = '@qa-cortex/core';
const PACKAGE_JSON = 'packages/core/package.json';

/**
 * @param {string} text
 * @returns {unknown}
 */
const parseJson = (text) => JSON.parse(text);

// Use the npm that runs this script (npm sets npm_execpath), so it works on every OS.
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('Run this through npm: npm run pack:check');
  process.exit(2);
}
const output = execFileSync(process.execPath, [npmCli, 'pack', '--workspace', WORKSPACE, '--dry-run', '--json'], {
  encoding: 'utf8',
});
const [pack] = /** @type {{ name: string; version: string; size: number; files: { path: string }[] }[]} */ (parseJson(output));
if (!pack) throw new Error('npm pack returned no result');
const files = new Set(pack.files.map((f) => f.path));

const manifest = /** @type {{ exports: Record<string, string | Record<string, string>> }} */ (parseJson(readFileSync(PACKAGE_JSON, 'utf8')));
const exportTargets = Object.values(manifest.exports).flatMap((target) => (typeof target === 'string' ? [target] : Object.values(target)));

const problems = [];
for (const target of exportTargets) {
  const path = target.replace(/^\.\//, '');
  if (!files.has(path)) problems.push(`exports target missing from the package: ${target} (did the build run?)`);
}
for (const required of ['package.json', 'LICENSE']) {
  if (!files.has(required)) problems.push(`required file missing from the package: ${required}`);
}
const forbidden = [...files].filter((f) => /\.tsbuildinfo$|(^|\/)(test|node_modules)\//.test(f));
for (const f of forbidden) problems.push(`file must not be published: ${f}`);

if (problems.length > 0) {
  console.error(`Package check FAILED for ${pack.name}@${pack.version}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  `Package check passed: ${pack.name}@${pack.version}, ${files.size} files, ${(pack.size / 1024).toFixed(1)} kB packed; ` +
    `all ${exportTargets.length} exports targets present.`,
);
