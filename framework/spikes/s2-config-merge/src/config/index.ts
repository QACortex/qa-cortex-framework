// Public surface of @qa-cortex/core/config (spike).
export { z } from 'zod';
export { coreSchema, type CoreSchema, type CoreConfig, type ConfigSchema } from './schema.js';
export {
  defineConfig,
  loadConfig,
  PROFILE_ENV_VAR,
  DEFAULT_PROFILE,
  type ConfigDefinition,
  type ConfigOverlay,
  type LoadedConfig,
  type ConfigOf,
  type LoadOptions,
} from './load.js';
export { ConfigError, type ConfigIssue } from './errors.js';
export { configFixtures, configOption } from './fixtures.js';
export type { DeepPartial, DeepReadonly } from './types.js';
