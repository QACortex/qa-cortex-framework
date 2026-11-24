import type { z } from 'zod';
import { ConfigError, toConfigIssues } from './errors.js';
import { deepFreeze } from './freeze.js';
import { mergeLayers, MergeError, type Layer } from './merge.js';
import { coreSchema, type ConfigSchema, type CoreSchema } from './schema.js';
import type { DeepPartial, DeepReadonly } from './types.js';

/** Environment variable that selects the profile when loadConfig() is not given one. */
export const PROFILE_ENV_VAR = 'QA_CORTEX_PROFILE';
/** Profile used when neither options.profile, QA_CORTEX_PROFILE nor defaultProfile is set. */
export const DEFAULT_PROFILE = 'local';
/** Result key holding the selected profile name; config layers and schemas may not define it. */
const PROFILE_KEY = 'profile';

/** What a base, profile or override layer may contain for schema S. */
export type ConfigOverlay<S extends ConfigSchema> = DeepPartial<z.input<S>>;

/** A complete, typed config definition, as returned by defineQaConfig(). */
export interface ConfigDefinition<S extends ConfigSchema = CoreSchema> {
  readonly schema: S;
  readonly base?: ConfigOverlay<S> | undefined;
  /** Every selectable profile must be declared, even if empty (`local: {}`). */
  readonly profiles: Readonly<Record<string, ConfigOverlay<S>>>;
  /** Used when neither options.profile nor QA_CORTEX_PROFILE is set. Defaults to "local". */
  readonly defaultProfile?: string | undefined;
}

/** Input to defineQaConfig(): like ConfigDefinition, but `schema` may be omitted (core schema). */
export interface ConfigDefinitionInput<S extends ConfigSchema> extends Omit<ConfigDefinition<S>, 'schema'> {
  readonly schema?: S | undefined;
}

/**
 * The validated, frozen result, parameterised by the schema's OUTPUT type (not the schema)
 * so editor hovers show config fields instead of Zod internals.
 */
export type LoadedConfig<T = z.output<CoreSchema>> = DeepReadonly<Omit<T, typeof PROFILE_KEY>> & {
  /** The profile that produced this config. */
  readonly profile: string;
};

/** LoadedConfig for a schema: `type AppConfig = ConfigOf<typeof schema>`. */
export type ConfigOf<S extends ConfigSchema> = LoadedConfig<z.output<S>>;

export interface LoadOptions<S extends ConfigSchema> {
  /** Highest-priority profile choice. Falls back to QA_CORTEX_PROFILE, then defaultProfile, then "local". */
  readonly profile?: string | undefined;
  /** Top layer, above the profile. */
  readonly overrides?: ConfigOverlay<S> | undefined;
  /** Environment to read QA_CORTEX_PROFILE from. Defaults to process.env. */
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
}

/**
 * Declare a typed config definition. Single signature: pass `schema` to use an extension of
 * `coreSchema`; omit it to use `coreSchema`. The definition is returned as-is (not frozen);
 * nothing is validated until loadConfig().
 */
export function defineQaConfig<S extends ConfigSchema = CoreSchema>(definition: ConfigDefinitionInput<S>): ConfigDefinition<S> {
  // When `schema` is omitted, S falls back to its default (CoreSchema), so this cast is exact.
  return { ...definition, schema: definition.schema ?? (coreSchema as unknown as S) };
}

/**
 * Merge defaults → base → profile → overrides, validate once, deep-freeze.
 * Synchronous on purpose: callable at the top of playwright.config.ts (no top-level await).
 * Throws ConfigError listing every issue at once.
 */
export function loadConfig<S extends ConfigSchema>(definition: ConfigDefinition<S>, options: LoadOptions<S> = {}): LoadedConfig<z.output<S>> {
  const env = options.env ?? process.env;
  const fromEnv = nonEmpty(env[PROFILE_ENV_VAR]);
  const profile = options.profile ?? fromEnv ?? definition.defaultProfile ?? DEFAULT_PROFILE;

  const overlay = Object.hasOwn(definition.profiles, profile) ? definition.profiles[profile] : undefined;
  if (overlay === undefined) {
    const known = Object.keys(definition.profiles);
    const chosenBy = options.profile !== undefined ? 'loadConfig options' : fromEnv !== undefined ? `env ${PROFILE_ENV_VAR}` : 'default';
    throw new ConfigError(profile, [
      { path: '', message: `unknown profile "${profile}". Known profiles: ${known.length > 0 ? known.join(', ') : '(none)'}`, source: chosenBy },
    ]);
  }

  const layers: Layer[] = [
    { name: 'base', value: definition.base },
    { name: `profile "${profile}"`, value: overlay },
    { name: 'overrides', value: options.overrides },
  ];

  let merged;
  try {
    merged = mergeLayers(layers);
  } catch (error) {
    if (error instanceof MergeError) throw new ConfigError(profile, [{ path: '', message: error.message, source: 'merge' }]);
    throw error;
  }

  const result = definition.schema.safeParse(merged.value);
  if (!result.success) {
    const used = layers.filter((l) => l.value !== undefined).map((l) => l.name);
    throw new ConfigError(profile, toConfigIssues(result.error, merged.provenance, used));
  }
  if (Object.hasOwn(result.data, PROFILE_KEY)) {
    throw new ConfigError(profile, [
      { path: PROFILE_KEY, message: `"${PROFILE_KEY}" is reserved: the loaded config sets it to the selected profile name`, source: 'schema' },
    ]);
  }
  return deepFreeze({ ...result.data, [PROFILE_KEY]: profile }) as LoadedConfig<z.output<S>>;
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}
