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
  // The application under test is the QA Cortex Test Automation Lab. It has one public host, so
  // every profile points at it; in a real project each profile names its own environment's host
  // (for example https://staging.example.com/). Page objects use paths relative to baseURL.
  base: {
    baseURL: 'https://qacortex.com/lab-app/',
    site: { label: 'local (QA Cortex Test Automation Lab)', titleContains: 'QA Cortex' },
  },
  profiles: {
    local: {},
    staging: {
      site: { label: 'staging (simulated: QA Cortex Test Automation Lab)', titleContains: 'QA Cortex' },
    },
    // SIMULATED production for the Production guard demo: the same public practice application,
    // marked `production: true`, so the guard applies (no traces, videos or screenshots).
    production: {
      production: true,
      site: { label: 'production (simulated: QA Cortex Test Automation Lab)', titleContains: 'QA Cortex' },
    },
  },
});
