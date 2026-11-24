// @qa-cortex/core/presets: reporter and artifact presets (ADR 0003, ADR 0009).
//
// Plain Playwright values (`reporter`, and `trace`/`video`/`screenshot` for `use`) to put in
// your own defineConfig(). QA Cortex implements no reporter and post-processes nothing.
// This module never imports the config, logger, secrets or guard modules, or any API/AI code.

export { artifactPresets } from './artifacts.js';
export { qaPreset } from './preset.js';
export { PRESET_ENV_VAR, PRESET_NAMES, selectPreset } from './select.js';
export { PresetError } from './errors.js';
export type { ArtifactSettings, PresetName, PresetOptions, QaPreset, ReporterEntry, ReporterOptions, SelectPresetOptions } from './types.js';
