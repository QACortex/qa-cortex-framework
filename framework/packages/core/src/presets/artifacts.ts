import type { ArtifactSettings, PresetName } from './types.js';

/**
 * Artifact settings per preset (ADR 0003, ADR 0009). Every value predates Playwright 1.60.
 *   local       keep evidence of failures: trace, video and screenshot of failed tests
 *   ci          trace and screenshot of failed tests; no video
 *   production  nothing recorded: the shape the Production guard requires
 */
export const artifactPresets: Readonly<Record<PresetName, ArtifactSettings>> = Object.freeze({
  local: Object.freeze({ trace: 'retain-on-failure', video: 'retain-on-failure', screenshot: 'only-on-failure' }),
  ci: Object.freeze({ trace: 'retain-on-failure', video: 'off', screenshot: 'only-on-failure' }),
  production: Object.freeze({ trace: 'off', video: 'off', screenshot: 'off' }),
});
