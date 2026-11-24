// CommonJS consumer probe: require() of every public subpath of the installed package.
const assert = require('node:assert');

/** @type {string[]} */
const warnings = [];
process.on('warning', (w) => warnings.push(`${w.name}: ${w.message}`));

const config = require('@qa-cortex/core/config');
const logger = require('@qa-cortex/core/logger');
const secrets = require('@qa-cortex/core/secrets');
const guard = require('@qa-cortex/core/guard');
const presets = require('@qa-cortex/core/presets');
const pkg = require('@qa-cortex/core/package.json');

assert.equal(typeof config.defineQaConfig, 'function');
assert.equal(typeof config.loadConfig, 'function');
assert.equal(typeof config.configFixtures, 'function');
assert.equal(typeof logger.createLogger, 'function');
assert.equal(typeof logger.loggerFixtures, 'function');
assert.equal(typeof secrets.loadSecrets, 'function');
assert.equal(typeof secrets.secretsFixtures, 'function');
assert.equal(typeof guard.assertProductionSafe, 'function');
assert.equal(typeof guard.productionGuardFixtures, 'function');
assert.equal(typeof presets.qaPreset, 'function');
assert.equal(typeof presets.selectPreset, 'function');
// Installed from the tarball, not linked from a workspace.
assert.match(require.resolve('@qa-cortex/core/config'), /node_modules[\\/]@qa-cortex[\\/]core[\\/]dist[\\/]config[\\/]index\.js$/);
for (const specifier of ['@qa-cortex/core', '@qa-cortex/core/dist/config/index.js', '@qa-cortex/core/src/config/index.ts']) {
  assert.throws(() => require(specifier), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }, specifier);
}

import('@qa-cortex/core/config')
  .then((viaImport) => {
    assert.strictEqual(viaImport.ConfigError, config.ConfigError, 'require() and import() share one module instance');
    setImmediate(() => {
      console.log(`probe.cjs OK | ${pkg.name}@${pkg.version} | node ${process.version} | warnings: ${warnings.length ? warnings.join('; ') : 'none'}`);
    });
  })
  .catch((/** @type {unknown} */ error) => {
    console.error(error);
    process.exit(1);
  });
