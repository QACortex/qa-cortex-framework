import type { ReporterDescription } from '@playwright/test';
import { artifactPresets } from './artifacts.js';
import { PresetError } from './errors.js';
import { DEFAULT_OUTPUT_DIR, buildReporters, checkReportPaths } from './reporters.js';
import { PRESET_NAMES, isPresetName } from './select.js';
import type { ArtifactSettings, PresetName, PresetOptions, QaPreset } from './types.js';

/**
 * Plain Playwright `reporter` and `use` values for a preset, with your overrides applied.
 * Throws PresetError listing every problem (a reporter the production preset does not allow,
 * conflicting reporter options, clashing output paths). Returns a fresh copy every call.
 *
 * ```ts
 * const preset = qaPreset(selectPreset({ production: qa.production }));
 * const config = defineConfig({ reporter: preset.reporter, use: { ...preset.use, baseURL: qa.baseURL } });
 * assertProductionSafe(config, { production: qa.production }); // the guard still checks the result
 * ```
 */
export function qaPreset(name: PresetName, options: PresetOptions = {}): QaPreset {
  if (!isPresetName(name)) throw new PresetError([`"${String(name)}" is not a preset; use one of: ${PRESET_NAMES.join(', ')}`]);
  const problems: string[] = [];

  const overrides = Object.fromEntries(Object.entries(options.artifacts ?? {}).filter(([, v]) => v !== undefined)) as Partial<ArtifactSettings>;
  const use: ArtifactSettings = Object.freeze({ ...artifactPresets[name], ...overrides });

  const reporter = buildReporters(name, options.reporters ?? {}, options.env ?? process.env, problems);
  checkReportPaths(reporter, options.outputDir ?? DEFAULT_OUTPUT_DIR, problems);
  if (problems.length > 0) throw new PresetError(problems);

  return Object.freeze({ name, reporter: reporter as ReporterDescription[], use });
}
