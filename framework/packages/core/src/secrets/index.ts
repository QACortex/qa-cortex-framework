// @qa-cortex/core/secrets: typed secrets from the environment, per profile (ADR 0008).
//
// Values are wrapped in Secret objects that print as [REDACTED]; the raw value is reachable
// only through Secret.reveal(). Errors name secrets and variables, never values.
// This module never imports the config or logger modules, or any API/AI code.

export { Secret } from './secret.js';
export { defineSecrets, loadSecrets } from './load.js';
export { SecretsError, type SecretIssue } from './errors.js';
export { secretsFixtures, type SecretsFixtureDependencies, type SecretsFixtures, type SecretsWorkerFixtures } from './fixtures.js';
export type { LoadSecretsOptions, RequiredSecretName, SecretEntries, SecretEntry, SecretName, SecretStore, SecretsDefinition } from './types.js';
