export interface SecretIssue {
  /** Secret name from defineSecrets(), or an empty string for problems with the call itself. */
  readonly secret: string;
  /** Environment variable involved, when known and valid. */
  readonly variable?: string | undefined;
  readonly message: string;
}

/**
 * Thrown by loadSecrets() and SecretStore.get(). Lists every issue at once with the secret
 * and variable names. Never includes a secret value.
 */
export class SecretsError extends Error {
  override readonly name = 'SecretsError';
  declare readonly profile: string;
  declare readonly issues: readonly SecretIssue[];

  constructor(profile: string, issues: readonly SecretIssue[]) {
    super(
      [
        `Missing or invalid QA Cortex secrets (profile "${profile}"):`,
        ...issues.map((i) => `  - ${i.secret || '(options)'}: ${i.variable === undefined ? '' : `environment variable ${i.variable} `}${i.message}`),
      ].join('\n'),
    );
    // Non-enumerable, as in ConfigError: runners that print own properties show the message once.
    Object.defineProperties(this, {
      profile: { value: profile, enumerable: false },
      issues: { value: Object.freeze([...issues]), enumerable: false },
    });
  }
}
