// Demonstrates a readable ConfigError from an invalid configuration.
// Exits 0 when the error is raised as expected, 1 otherwise.
import { ConfigError, coreSchema, defineQaConfig, loadConfig, z } from '@qa-cortex/core/config';

const schema = coreSchema.extend({
  site: z.strictObject({ label: z.string(), titleContains: z.string().min(1) }),
});

// Three deliberate mistakes, each in a different layer. The baseURL also carries a
// secret-looking token, to show that error messages never print config values.
const broken = defineQaConfig({
  schema,
  base: {
    baseURL: 'not-a-url?token=SECRET-TOKEN-123', // 1. invalid URL (base)
    site: { label: 'demo', titleContains: 'TodoMVC' },
  },
  profiles: {
    local: {
      site: { titleContains: '' }, // 2. too short (profile "local")
      // The type checker already rejects mistake 3 (`npm run typecheck`); this directive
      // keeps it in the file so the runtime check can be shown too.
      // @ts-expect-error unknown key
      retries: 2, // 3. unknown key, typo for a Playwright setting (profile "local")
    },
  },
});

try {
  loadConfig(broken, { profile: 'local' });
  console.error('Expected a ConfigError, but the config loaded.');
  process.exit(1);
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  console.log(error.message);
  console.log('');
  console.log(`ConfigError raised as expected: ${error.issues.length} issues, profile "${error.profile}".`);
  console.log(`Secret value printed anywhere: ${error.message.includes('SECRET') || JSON.stringify(error.issues).includes('SECRET')}`);
}
