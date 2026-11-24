import type { z } from 'zod';
import { ConfigError, toConfigIssues } from './errors.js';
import { deepFreeze } from './freeze.js';
import { mergeLayers, MergeError, type Layer } from './merge.js';
import { coreSchema, type ConfigSchema, type CoreSchema } from './schema.js';
import type { DeepPartial, DeepReadonly } from './types.js';

export const PROFILE_ENV_VAR = 'QA_PROFILE';
export const DEFAULT_PROFILE = 'local';

/** What a base/profile/override layer may contain for schema S. */
export type ConfigOverlay<S extends ConfigSchema> = DeepPartial<z.input<S>>;

export interface ConfigDefinition<S extends ConfigSchema = CoreSchema> {
  readonly schema: S;
  readonly base?: ConfigOverlay<S>;
  readonly profiles: Readonly<Record<string, ConfigOverlay<S>>>;
  /** Used when neither options.profile nor QA_PROFILE is set. Defaults to "local". */
  readonly defaultProfile?: string;
}

/**
 * The validated, frozen result, parameterised by the schema's OUTPUT type (not the schema)
 * so editor hovers show config fields instead of Zod internals.
 */
export type LoadedConfig<T = z.output<CoreSchema>> = DeepReadonly<T> & {
  /** The profile that produced this config. */
  readonly profile: string;
};

/** Convenience: LoadedConfig for a schema. `type AppConfig = ConfigOf<typeof schema>`. */
export type ConfigOf<S extends ConfigSchema> = LoadedConfig<z.output<S>>;

export interface LoadOptions<S extends ConfigSchema> {
  /** Highest precedence after overrides. Falls back to process.env.QA_PROFILE, then defaultProfile. */
  readonly profile?: string;
  readonly overrides?: ConfigOverlay<S>;
  /** Injected for tests; defaults to process.env. */
  readonly env?: Readonly<Record<string, string | undefined>>;
}

type CoreDefinitionInput = Omit<ConfigDefinition<CoreSchema>, 'schema'> & { readonly schema?: undefined };

/** Identity helper for typing. With no `schema`, the core schema is used. */
export function defineConfig(def: CoreDefinitionInput): ConfigDefinition<CoreSchema>;
export function defineConfig<S extends ConfigSchema>(def: ConfigDefinition<S>): ConfigDefinition<S>;
export function defineConfig(def: ConfigDefinition<ConfigSchema> | CoreDefinitionInput): ConfigDefinition<ConfigSchema> {
  return { ...def, schema: def.schema ?? coreSchema };
}

/**
 * Merge base -> profile -> overrides, validate once, deep-freeze.
 * Synchronous on purpose: callable at the top of playwright.config.ts (no top-level await).
 * Throws ConfigError with every issue at once.
 */
export function loadConfig<S extends ConfigSchema>(
  def: ConfigDefinition<S>,
  options: LoadOptions<S> = {},
): LoadedConfig<z.output<S>> {
  const env = options.env ?? process.env;
  const profile = options.profile ?? nonEmpty(env[PROFILE_ENV_VAR]) ?? def.defaultProfile ?? DEFAULT_PROFILE;

  const overlay = Object.hasOwn(def.profiles, profile) ? def.profiles[profile] : undefined;
  if (overlay === undefined) {
    const known = Object.keys(def.profiles);
    throw new ConfigError(profile, [
      {
        path: '',
        message: `unknown profile "${profile}". Known profiles: ${known.length ? known.join(', ') : '(none)'}`,
        source: options.profile !== undefined ? 'loadConfig options' : env[PROFILE_ENV_VAR] ? `env ${PROFILE_ENV_VAR}` : 'default',
      },
    ]);
  }

  const layers: Layer[] = [
    { name: 'base', value: def.base },
    { name: `profile "${profile}"`, value: overlay },
    { name: 'overrides', value: options.overrides },
  ];

  let merged;
  try {
    merged = mergeLayers(layers);
  } catch (e) {
    if (e instanceof MergeError) throw new ConfigError(profile, [{ path: '', message: e.message, source: 'merge' }]);
    throw e;
  }

  const result = def.schema.safeParse(merged.value);
  if (!result.success) {
    const used = layers.filter((l) => l.value !== undefined).map((l) => l.name);
    throw new ConfigError(profile, toConfigIssues(result.error, merged.provenance, used));
  }
  return deepFreeze({ ...result.data, profile }) as LoadedConfig<z.output<S>>;
}

function nonEmpty(v: string | undefined): string | undefined {
  return v === undefined || v.trim() === '' ? undefined : v.trim();
}
