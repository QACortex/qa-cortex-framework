import { SecretsError, type SecretIssue } from './errors.js';
import { Secret } from './secret.js';
import type { LoadSecretsOptions, RequiredSecretName, SecretEntries, SecretName, SecretStore, SecretsDefinition } from './types.js';

/**
 * Values shorter than this are rejected unless `allowShort` is set. Must equal the logger's
 * MIN_SECRET_LENGTH (a test checks it): shorter values are not redacted there.
 */
const MIN_LENGTH = 4;

/** Portable environment variable names. Values are never printed, and neither are names that fail this. */
const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;

/** Raw values of each store, for secretsFixtures() only. Deliberately not part of SecretStore. */
const storeValues = new WeakMap<object, readonly string[]>();

/**
 * Declare the secrets a project needs. Nothing is read until loadSecrets(). The `const` type
 * parameter keeps literal types, so `get()` accepts exactly the secrets present in every profile.
 *
 * ```ts
 * export const secretsDef = defineSecrets({
 *   adminPassword: { env: 'ADMIN_PASSWORD' },
 *   apiToken: { env: { local: 'LOCAL_API_TOKEN', staging: 'STAGING_API_TOKEN' } },
 *   basicAuthPassword: { env: 'BASIC_AUTH_PASSWORD', optional: true },
 * });
 * ```
 */
export function defineSecrets<const E extends SecretEntries>(entries: E): SecretsDefinition<E> {
  return Object.freeze({ entries });
}

/**
 * Read every secret for `profile` from the environment. Synchronous, so it works at the top of
 * playwright.config.ts. Throws SecretsError listing every problem at once; messages name the
 * secret and variable, never a value.
 */
export function loadSecrets<E extends SecretEntries>(definition: SecretsDefinition<E>, options: LoadSecretsOptions): SecretStore<E> {
  const profile = options.profile;
  if (typeof profile !== 'string' || profile.trim() === '') {
    throw new SecretsError(String(profile), [{ secret: '', message: 'profile must be a non-empty string (pass the config profile, e.g. qa.profile)' }]);
  }
  const env = options.env ?? process.env;
  const issues: SecretIssue[] = [];
  const found = new Map<string, Secret>();

  for (const [name, entry] of Object.entries(definition.entries)) {
    const mapped = typeof entry.env === 'string' ? [entry.env] : Object.values(entry.env);
    if (mapped.length === 0) {
      issues.push({ secret: name, message: 'env map is empty: name a variable for at least one profile' });
      continue;
    }
    if (mapped.some((v) => typeof v !== 'string' || !ENV_NAME.test(v))) {
      // The bad name is not shown: a value pasted where the variable name belongs must not be printed.
      issues.push({ secret: name, message: 'has an invalid environment variable name (use A-Z, 0-9 and _, not starting with a digit); not shown in case it is a value' });
      continue;
    }
    const variable = typeof entry.env === 'string' ? entry.env : Object.hasOwn(entry.env, profile) ? entry.env[profile] : undefined;
    if (variable === undefined) continue; // not used in this profile

    const value = env[variable];
    if (value === undefined || value === '') {
      if (entry.optional !== true) issues.push({ secret: name, variable, message: value === '' ? 'is empty' : 'is not set' });
      continue;
    }
    if (value.length < MIN_LENGTH && entry.allowShort !== true) {
      issues.push({
        secret: name,
        variable,
        message: `is shorter than ${MIN_LENGTH} characters, so log redaction would ignore it (set allowShort: true to accept it)`,
      });
      continue;
    }
    found.set(name, new Secret(name, value));
  }

  if (issues.length > 0) throw new SecretsError(profile, issues);
  return createStore<E>(profile, definition, found);
}

function createStore<E extends SecretEntries>(profile: string, definition: SecretsDefinition<E>, found: ReadonlyMap<string, Secret>): SecretStore<E> {
  const names = Object.freeze([...found.keys()]) as readonly SecretName<E>[];
  const store: SecretStore<E> = Object.freeze({
    profile,
    get(name: RequiredSecretName<E>): Secret {
      const secret = found.get(name);
      if (secret !== undefined) return secret;
      const known = Object.hasOwn(definition.entries, name);
      throw new SecretsError(profile, [
        {
          secret: String(name),
          message: known ? 'is not available in this profile (optional and unset, or not mapped for it): read it with find()' : 'is not defined in defineSecrets()',
        },
      ]);
    },
    find: (name: SecretName<E>): Secret | undefined => found.get(name),
    has: (name: SecretName<E>): boolean => found.has(name),
    names: (): readonly SecretName<E>[] => names,
  });
  storeValues.set(store, Object.freeze([...found.values()].map((s) => s.reveal())));
  return store;
}

/**
 * Internal (not exported from the package): every value of a store loaded by loadSecrets(),
 * for the logger's redaction list. Empty for any other object.
 */
export function redactionValues(store: object): readonly string[] {
  return storeValues.get(store) ?? [];
}
