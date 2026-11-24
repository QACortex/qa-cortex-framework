import { PresetError } from './errors.js';
import type { PresetName, SelectPresetOptions } from './types.js';

/** Environment variable that chooses a preset by hand (never weaker than production; see selectPreset). */
export const PRESET_ENV_VAR = 'QA_CORTEX_PRESET';

export const PRESET_NAMES: readonly PresetName[] = Object.freeze(['local', 'ci', 'production'] as const);

export function isPresetName(value: unknown): value is PresetName {
  return typeof value === 'string' && (PRESET_NAMES as readonly string[]).includes(value);
}

/**
 * Choose a preset:
 *   production profile                → "production" (QA_CORTEX_PRESET may only say "production")
 *   QA_CORTEX_PRESET=local|ci|production → that preset
 *   CI set (Playwright's convention)  → "ci"
 *   otherwise                          → "local"
 */
export function selectPreset(options: SelectPresetOptions): PresetName {
  const env = options.env ?? process.env;
  const raw = env[PRESET_ENV_VAR]?.trim();
  const requested = raw === undefined || raw === '' ? undefined : raw;
  if (requested !== undefined && !isPresetName(requested)) {
    throw new PresetError([`${PRESET_ENV_VAR}="${requested}" is not a preset; use one of: ${PRESET_NAMES.join(', ')}`]);
  }
  if (options.production) {
    if (requested !== undefined && requested !== 'production') {
      throw new PresetError([`${PRESET_ENV_VAR}="${requested}" is not allowed for a production profile: production runs always use the "production" preset`]);
    }
    return 'production';
  }
  if (requested !== undefined) return requested;
  return (options.ci ?? !!env.CI) ? 'ci' : 'local';
}
