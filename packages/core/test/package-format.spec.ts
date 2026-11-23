// Foundation checks for @qa-cortex/core, run against the BUILT package through its public
// name (the npm workspace link), the way a consumer would load it. See ADR 0001.
import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, sep } from 'node:path';
import { promisify } from 'node:util';

const require = createRequire(import.meta.url);
const run = promisify(execFile);

test.describe('package format (ESM-only, subpath exports)', () => {
  test('./config resolves to the built dist entry', () => {
    const resolved = require.resolve('@qa-cortex/core/config');
    expect(resolved.endsWith(join('dist', 'config', 'index.js'))).toBe(true);
    expect(resolved.includes(`${sep}src${sep}`)).toBe(false);
  });

  // Runs in a plain Node child process on purpose. Inside this repo the package is reached
  // through the npm workspace symlink (outside node_modules), so Playwright's own module
  // hooks would transform our dist files and give a misleading result. A child process sees
  // exactly what a CommonJS consumer's Node sees.
  test('plain Node: require() and import() load the same module instance', async () => {
    const probe = `
      const viaRequire = require('@qa-cortex/core/config');
      import('@qa-cortex/core/config').then((viaImport) => {
        process.stdout.write(JSON.stringify({
          same: viaRequire.RESERVED_NAMESPACES === viaImport.RESERVED_NAMESPACES,
          value: viaRequire.RESERVED_NAMESPACES,
        }));
      });`;
    const { stdout, stderr } = await run(process.execPath, ['--input-type=commonjs', '-e', probe], { cwd: import.meta.dirname });
    expect(JSON.parse(stdout)).toEqual({ same: true, value: ['api', 'ai'] });
    expect(stderr).toBe(''); // no ExperimentalWarning or load errors
  });

  test('the package root and non-exported paths are blocked', () => {
    for (const specifier of ['@qa-cortex/core', '@qa-cortex/core/dist/config/index.js', '@qa-cortex/core/src/config/index.ts']) {
      expect(() => require.resolve(specifier), specifier).toThrow(expect.objectContaining({ code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }));
    }
  });

  test('package.json is exported for tooling', () => {
    const pkg = require('@qa-cortex/core/package.json') as { name: string; type: string };
    expect(pkg).toMatchObject({ name: '@qa-cortex/core', type: 'module' });
  });

  test('built JavaScript never references @playwright/test (peer is type-only)', async () => {
    const distDir = dirname(dirname(require.resolve('@qa-cortex/core/config')));
    const jsFiles = (await readdir(distDir, { recursive: true })).filter((f) => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);
    for (const file of jsFiles) {
      expect(await readFile(join(distDir, file), 'utf8'), file).not.toContain('@playwright/test');
    }
  });

  test('declarations and declaration maps are emitted and point at shipped src', async () => {
    const entry = require.resolve('@qa-cortex/core/config');
    const dts = entry.replace(/\.js$/, '.d.ts');
    const map = JSON.parse(await readFile(`${dts}.map`, 'utf8')) as { sources: string[] };
    expect(await readFile(dts, 'utf8')).toContain('RESERVED_NAMESPACES');
    expect(map.sources).toEqual(['../../src/config/index.ts']);
  });
});

test.describe('config: reserved namespaces (ADR 0002)', () => {
  test('api and ai are reserved, frozen, and recognised', async () => {
    const { RESERVED_NAMESPACES, isReservedNamespace } = await import('@qa-cortex/core/config');
    expect(RESERVED_NAMESPACES).toEqual(['api', 'ai']);
    expect(Object.isFrozen(RESERVED_NAMESPACES)).toBe(true);
    expect(isReservedNamespace('api')).toBe(true);
    expect(isReservedNamespace('ai')).toBe(true);
    expect(isReservedNamespace('baseURL')).toBe(false);
    expect(isReservedNamespace('API')).toBe(false);
  });
});
