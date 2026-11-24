// Runs one isolated consumer project against the PACKED @qa-cortex/core tarball.
//
//   node compat/run-consumer.mjs --tarball <file.tgz|dir> --playwright <version> --format <cjs|esm>
//                                [--install-browser] [--workdir <dir>]
//
// Copies compat/consumer/ to a temporary folder outside the repository, writes its
// package.json ("type": "commonjs" or "module"), installs the tarball and the requested
// Playwright version with npm (no lockfile, nothing in the repo changes), then runs:
//   1. probe.cjs   require() of every subpath, root and deep imports blocked
//   2. probe.mjs   import of every subpath, import/require share one instance
//   3. tsc         consumer type-check, skipLibCheck: false, against that Playwright version
//   4. playwright  config, logger, secrets and guard fixture tests and a Chromium smoke test (local server)
// Exits 1 if any step fails. Appends a summary to $GITHUB_STEP_SUMMARY when set.
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    tarball: { type: 'string' },
    playwright: { type: 'string' },
    format: { type: 'string' },
    'install-browser': { type: 'boolean', default: false },
    workdir: { type: 'string' },
  },
});
if (!args.tarball || !args.playwright || (args.format !== 'cjs' && args.format !== 'esm')) {
  console.error('usage: node compat/run-consumer.mjs --tarball <file|dir> --playwright <version> --format <cjs|esm> [--install-browser]');
  process.exit(2);
}

const template = join(dirname(fileURLToPath(import.meta.url)), 'consumer');
const tarball = resolveTarball(resolve(args.tarball));
const root = args.workdir ? resolve(args.workdir) : mkdtempSync(join(tmpdir(), 'qac-consumer-'));
const dir = join(root, args.format);
mkdirSync(root, { recursive: true });
cpSync(template, dir, { recursive: true });
writeFileSync(
  join(dir, 'package.json'),
  `${JSON.stringify(
    {
      name: `qa-cortex-compat-${args.format}`,
      private: true,
      type: args.format === 'cjs' ? 'commonjs' : 'module',
      dependencies: { '@qa-cortex/core': `file:${tarball}` },
      devDependencies: { '@playwright/test': args.playwright, '@types/node': '22.20.5', typescript: '6.0.3' },
    },
    null,
    2,
  )}\n`,
);

// Child processes start from a clean environment for QA Cortex settings.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('QA_CORTEX_')));
const secret = `compat-synthetic-${process.pid}-${Date.now()}`;
env.QAC_COMPAT_SECRET = secret;

const label = `${args.format.toUpperCase()} consumer · Node ${process.version} · Playwright ${args.playwright} · ${process.platform}`;
console.log(`\n=== ${label}\n    dir: ${dir}\n    tarball: ${tarball}`);

/** @type {{ step: string; ok: boolean; seconds: string; note: string }[]} */
const results = [];
const node = process.execPath;
const playwrightCli = join(dir, 'node_modules', '@playwright', 'test', 'cli.js');

step('npm install (tarball + Playwright)', [npmCli(), 'install', '--no-audit', '--no-fund', '--no-package-lock']);
step('probe.cjs: require() of the ESM package', ['probe.cjs'], { note: (out) => /warnings: .*/.exec(out)?.[0] ?? '' });
step('probe.mjs: import of the ESM package', ['probe.mjs'], { note: (out) => /warnings: .*/.exec(out)?.[0] ?? '' });
step('tsc: type-check (skipLibCheck: false)', [join(dir, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', '.']);
if (args['install-browser']) {
  const deps = process.platform === 'linux' ? ['--with-deps'] : [];
  step('playwright install chromium (headless shell)', [playwrightCli, 'install', ...deps, '--only-shell', 'chromium']);
}
step('playwright test: fixtures + Chromium smoke', [playwrightCli, 'test'], {
  check: (out) =>
    out.includes(secret)
      ? 'the synthetic secret appeared in the output'
      : !out.includes('[REDACTED]')
        ? 'no [REDACTED] log line found in the output'
        : !/4 passed/.test(out)
          ? 'expected "4 passed"'
          : undefined,
  note: (out) => /\d+ passed[^\n]*/.exec(out)?.[0] ?? '',
});

const failed = results.filter((r) => !r.ok);
const table = [
  `#### ${failed.length ? '❌' : '✅'} ${label}`,
  '',
  '| Step | Result | Time | Note |',
  '|---|---|---|---|',
  ...results.map((r) => `| ${r.step} | ${r.ok ? 'pass' : '**FAIL**'} | ${r.seconds}s | ${r.note.replaceAll('|', '\\|')} |`),
  '',
].join('\n');
console.log(`\n${table}`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
process.exit(failed.length ? 1 : 0);

/**
 * Run `node <argv>` in the consumer folder, unless an earlier step failed.
 * @param {string} name
 * @param {string[]} argv
 * @param {{ check?: (output: string) => string | undefined; note?: (output: string) => string }} [options]
 */
function step(name, argv, options = {}) {
  if (results.some((r) => !r.ok)) {
    results.push({ step: name, ok: false, seconds: '0.0', note: 'skipped after an earlier failure' });
    return;
  }
  const started = Date.now();
  const run = spawnSync(node, argv, { cwd: dir, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  process.stdout.write(`\n--- ${name}\n${output}`);
  const problem = run.status !== 0 ? `exit code ${run.status ?? run.signal}` : options.check?.(output);
  results.push({
    step: name,
    ok: problem === undefined,
    seconds: ((Date.now() - started) / 1000).toFixed(1),
    note: problem ?? options.note?.(output) ?? '',
  });
}

/** npm's own CLI script for the running Node, so no shell is needed on any OS. */
function npmCli() {
  const bin = dirname(process.execPath);
  const candidates = [
    process.env.npm_execpath,
    join(bin, 'node_modules', 'npm', 'bin', 'npm-cli.js'), // Windows layout
    join(bin, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'), // Linux/macOS layout
  ];
  const found = candidates.find((p) => p?.endsWith('.js') && existsSync(p));
  if (!found) throw new Error(`cannot locate npm-cli.js next to ${process.execPath}`);
  return found;
}

/** @param {string} path a .tgz file, or a folder containing exactly one */
function resolveTarball(path) {
  if (statSync(path).isFile()) return path;
  const tgz = readdirSync(path).filter((f) => f.endsWith('.tgz'));
  if (tgz.length !== 1) throw new Error(`expected exactly one .tgz in ${path}, found ${tgz.length}`);
  return join(path, /** @type {string} */ (tgz[0]));
}
