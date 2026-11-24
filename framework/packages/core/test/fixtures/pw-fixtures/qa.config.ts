// Config used by the fixture tests. `loadCount` is a TEST-ONLY probe: the transform runs on
// every successful load, so it counts how often this worker process loaded the config.
import { coreSchema, defineQaConfig, z } from '@qa-cortex/core/config';

const counter = globalThis as { __qacLoads?: number };
export const loadCount = (): number => counter.__qacLoads ?? 0;

export const schema = coreSchema.extend({
  app: z.strictObject({ tenant: z.string() }),
  probe: z
    .string()
    .default('loaded')
    .transform((value) => {
      counter.__qacLoads = loadCount() + 1;
      return value;
    }),
});

export const qaConfig = defineQaConfig({
  schema,
  base: { baseURL: 'http://localhost:3000', app: { tenant: 'acme' } },
  profiles: {
    local: {},
    staging: { baseURL: 'https://staging.example.test', app: { tenant: 'acme-staging' } },
  },
});
