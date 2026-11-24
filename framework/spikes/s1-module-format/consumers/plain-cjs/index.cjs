const assert = require('node:assert');
const warnings = [];
process.on('warning', (w) => warnings.push(`${w.name}: ${w.message}`));
const viaRequire = require('@qa-cortex/core/config');
const { logTo } = require('@qa-cortex/core/logger');
(async () => {
  const viaImport = await import('@qa-cortex/core/config');
  assert.strictEqual(viaRequire.ConfigError, viaImport.ConfigError, 'require() and import() must share one instance');
  viaRequire.loadConfig();
  assert.strictEqual(viaImport.getLoadCount(), 1, 'state shared across require/import');
  const ti = { annotations: [] }; logTo(ti, 'x'); assert.strictEqual(ti.annotations.length, 1);
  try { require('@qa-cortex/core'); assert.fail('root import should be blocked'); }
  catch (e) { assert.strictEqual(e.code, 'ERR_PACKAGE_PATH_NOT_EXPORTED'); }
  await new Promise((r) => setImmediate(r));
  console.log('plain-cjs OK; warnings:', warnings.length ? warnings : 'none');
})().catch((e) => { console.error(e); process.exit(1); });
