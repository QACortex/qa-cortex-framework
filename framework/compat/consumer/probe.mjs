// ES module consumer probe: import of every public subpath of the installed package.
import assert from 'node:assert';
import { createRequire } from 'node:module';
import * as config from '@qa-cortex/core/config';
import * as logger from '@qa-cortex/core/logger';

/** @type {string[]} */
const warnings = [];
process.on('warning', (w) => warnings.push(`${w.name}: ${w.message}`));

assert.equal(typeof config.defineQaConfig, 'function');
assert.equal(typeof config.configFixtures, 'function');
assert.equal(typeof logger.loggerFixtures, 'function');
assert.match(import.meta.resolve('@qa-cortex/core/logger'), /node_modules\/@qa-cortex\/core\/dist\/logger\/index\.js$/);
// The package root is not exported. A variable keeps the type checker from rejecting the
// literal at compile time, so the runtime refusal is what gets checked.
const root = '@qa-cortex/core';
await assert.rejects(import(root), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });

const require = /** @type {(id: string) => unknown} */ (createRequire(import.meta.url));
const viaRequire = /** @type {typeof config} */ (require('@qa-cortex/core/config'));
assert.strictEqual(viaRequire.ConfigError, config.ConfigError, 'import and require() share one module instance');

await new Promise((resolve) => setImmediate(resolve));
console.log(`probe.mjs OK | node ${process.version} | warnings: ${warnings.length ? warnings.join('; ') : 'none'}`);
