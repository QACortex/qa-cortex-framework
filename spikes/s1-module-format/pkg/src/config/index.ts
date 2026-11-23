// Probes: an exported error class (instanceof across loaders) and module-level state
// (would split in two under a dual build: the dual-package hazard).
export class ConfigError extends Error {
  override readonly name = 'ConfigError';
  constructor(readonly issues: readonly string[]) {
    super(issues.join('\n'));
  }
}

export interface LoadedConfig {
  readonly profile: string;
  readonly baseURL: string;
}

let loadCount = 0;
export const getLoadCount = (): number => loadCount;

export function loadConfig(profile = process.env.QA_PROFILE ?? 'local'): LoadedConfig {
  loadCount++;
  if (profile === 'bad') throw new ConfigError([`unknown profile "${profile}"`]);
  return Object.freeze({ profile, baseURL: 'http://localhost:3000' });
}

export const moduleUrl: string = import.meta.url;
