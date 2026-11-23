// The project's QA Cortex configuration: one definition, two environment profiles.
// Select a profile with QA_CORTEX_PROFILE (default: "local").
import { coreSchema, defineQaConfig, z, type ConfigOf } from '@qa-cortex/core/config';

// Extend the core schema with project-specific settings. Use the re-exported `z`.
export const schema = coreSchema.extend({
  site: z.strictObject({
    /** Human-readable name of the environment, shown in test annotations. */
    label: z.string(),
    /** Text the page title must contain in this environment. */
    titleContains: z.string().min(1),
  }),
});

export type DemoConfig = ConfigOf<typeof schema>;

export const qaConfig = defineQaConfig({
  schema,
  // `base` applies to every profile; each profile overrides only what differs.
  base: {
    baseURL: 'https://demo.playwright.dev/todomvc/',
    site: { label: 'local (Playwright TodoMVC demo)', titleContains: 'TodoMVC' },
  },
  profiles: {
    local: {},
    staging: {
      baseURL: 'https://playwright.dev/',
      site: { label: 'staging (playwright.dev)', titleContains: 'Playwright' },
    },
  },
});
