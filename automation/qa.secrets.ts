// The project's secrets: which environment variable holds each one, per profile.
// Values come from real environment variables (CI secrets) or, locally, from .env
// (gitignored; copy .env.example). Never from source code, qa.config.ts or Playwright's `use`.
import { defineSecrets } from '@qa-cortex/core/secrets';

export const secretsDef = defineSecrets({
  /** Required. SYNTHETIC token the logging demo uses to show redaction; not a real credential. */
  demoToken: { env: 'QA_DEMO_TOKEN', description: 'synthetic token for the logging demo' },
  /** Per profile and optional: only staging and production name a variable. Read it with find(). */
  apiToken: {
    env: { staging: 'QA_STAGING_API_TOKEN', production: 'QA_PRODUCTION_API_TOKEN' },
    optional: true,
    description: 'API token for test-data setup (example only; unused by the demo tests)',
  },
  /** Optional in every profile. Read it with find(). */
  basicAuthPassword: { env: 'QA_BASIC_AUTH_PASSWORD', optional: true, description: 'HTTP Basic auth password (example only)' },
});

export type ProjectSecrets = (typeof secretsDef)['entries'];
