import type { Secret } from './secret.js';

/** How one secret is found. */
export interface SecretEntry {
  /**
   * Environment variable holding the value: one name for every profile, or a map from profile
   * name to variable name. With a map, the secret does not exist in profiles the map leaves out.
   * Names use upper-case letters, digits and `_` (not starting with a digit).
   */
  readonly env: string | Readonly<Record<string, string>>;
  /** The variable may be unset. Read the secret with `find()`, which returns undefined. */
  readonly optional?: boolean | undefined;
  /**
   * Accept values shorter than 4 characters. Off by default: the logger ignores such short
   * values when redacting, so they would appear in logs.
   */
  readonly allowShort?: boolean | undefined;
  /** What the secret is for. Not sensitive; documentation only. */
  readonly description?: string | undefined;
}

export type SecretEntries = Readonly<Record<string, SecretEntry>>;

/** Returned by defineSecrets(); pass it to loadSecrets() or secretsFixtures(). */
export interface SecretsDefinition<E extends SecretEntries = SecretEntries> {
  readonly entries: E;
}

/** Every secret name in a definition. */
export type SecretName<E extends SecretEntries> = keyof E & string;

/**
 * Names of secrets that exist in every profile: not `optional`, and one variable name for all
 * profiles. `get()` accepts only these; read the others with `find()`.
 */
export type RequiredSecretName<E extends SecretEntries> = {
  [K in SecretName<E>]: E[K] extends { readonly optional: true } ? never : E[K]['env'] extends string ? K : never;
}[SecretName<E>];

/** The loaded secrets for one profile. Frozen. Raw values are reachable only through `Secret.reveal()`. */
export interface SecretStore<E extends SecretEntries = SecretEntries> {
  /** The profile these secrets were loaded for. */
  readonly profile: string;
  /** A secret that exists in every profile. Throws SecretsError if it is missing (only possible from untyped code). */
  get(name: RequiredSecretName<E>): Secret;
  /** Any secret, or undefined when it is optional and unset, or not mapped for this profile. */
  find(name: SecretName<E>): Secret | undefined;
  /** Whether the secret was loaded for this profile. */
  has(name: SecretName<E>): boolean;
  /** Names of the secrets loaded for this profile. */
  names(): readonly SecretName<E>[];
}

export interface LoadSecretsOptions {
  /** Profile to load. Pass the config's profile (`qa.profile`) so both always agree. */
  readonly profile: string;
  /** Environment to read. Defaults to process.env. */
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
}
