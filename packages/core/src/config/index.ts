// @qa-cortex/core/config: typed, layered, validated configuration (ADR 0002).
//
// Precedence: schema defaults → base → profile → overrides. The profile is chosen by
// loadConfig({ profile }), then QA_CORTEX_PROFILE, then defaultProfile, then "local".
// The result is deep-frozen. This module never imports Playwright or any API/AI code.

/** Zod 4, re-exported: build schema extensions with this `z`, not your own copy. */
export { z } from 'zod';

export { coreSchema, type ConfigSchema, type CoreConfig, type CoreSchema } from './schema.js';
export {
  DEFAULT_PROFILE,
  PROFILE_ENV_VAR,
  defineQaConfig,
  loadConfig,
  type ConfigDefinition,
  type ConfigDefinitionInput,
  type ConfigOf,
  type ConfigOverlay,
  type LoadOptions,
  type LoadedConfig,
} from './load.js';
export { ConfigError, type ConfigIssue } from './errors.js';
export { RESERVED_NAMESPACES, isReservedNamespace, type ReservedNamespace } from './reserved.js';
export type { DeepPartial, DeepReadonly } from './types.js';
