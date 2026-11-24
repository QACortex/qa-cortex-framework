// Presets and the Production guard together (the modules never import each other; only tests
// combine them). The production preset passes the guard by construction; the guard still
// checks the final config, so overrides cannot bypass it.
import { defineConfig, expect, test } from '@playwright/test';
import { ProductionGuardError, assertProductionSafe, checkProductionSafety } from '@qa-cortex/core/guard';
import { qaPreset, selectPreset } from '@qa-cortex/core/presets';

const noEnv = {};

test.describe('presets × Production guard', () => {
  test('the production preset passes the guard, with every reporter option it allows', () => {
    const variants = [
      qaPreset('production', { env: noEnv }),
      qaPreset('production', { env: noEnv, reporters: { json: true, extra: [['dot']] } }),
      qaPreset('production', { env: noEnv, reporters: { extra: [{ reporter: ['allure-playwright'], allowInProduction: true }] } }),
      qaPreset('production', { env: noEnv, reporters: { replace: [['line'], ['junit', { outputFile: 'reports/p.xml' }]] } }),
    ];
    for (const preset of variants) {
      const config = defineConfig({ reporter: preset.reporter, use: { ...preset.use, baseURL: 'https://example.test' } });
      expect(checkProductionSafety(config, { production: true, reporters: 'error' })).toEqual([]);
      expect(() => assertProductionSafe(config, { production: true, reporters: 'error' })).not.toThrow();
    }
  });

  test('the selected preset for a production profile always passes', () => {
    const preset = qaPreset(selectPreset({ production: true, ci: true, env: { CI: '1' } }), { env: { CI: '1', GITHUB_ACTIONS: 'true' } });
    expect(checkProductionSafety(defineConfig({ reporter: preset.reporter, use: preset.use }), { production: true, reporters: 'error' })).toEqual([]);
  });

  test('an unsafe artifact override in production is still blocked by the guard', () => {
    const preset = qaPreset('production', { artifacts: { trace: 'on' } });
    expect(() => assertProductionSafe(defineConfig({ reporter: preset.reporter, use: preset.use }), { production: true })).toThrow(ProductionGuardError);
  });

  test('local and ci presets are not production-safe', () => {
    for (const name of ['local', 'ci'] as const) {
      const preset = qaPreset(name, { env: noEnv });
      const settings = checkProductionSafety(defineConfig({ reporter: preset.reporter, use: preset.use }), { production: true, reporters: 'error' }).map(
        (v) => `${v.setting}=${v.found}`,
      );
      expect(settings, name).toEqual(
        expect.arrayContaining(['trace=retain-on-failure', 'screenshot=only-on-failure', 'reporter=html']),
      );
    }
  });

  test('presets and per-project use: the guard checks every project', () => {
    const preset = qaPreset('production');
    const config = defineConfig({
      reporter: preset.reporter,
      use: preset.use,
      projects: [{ name: 'safe' }, { name: 'override', use: { video: 'on' } }],
    });
    expect(checkProductionSafety(config, { production: true }).map((v) => `${v.project ?? ''}:${v.setting}`)).toEqual(['override:video']);
  });
});
