// Consumer project config: a schema extension and one profile, served by server.mjs.
import { coreSchema, defineQaConfig, z } from '@qa-cortex/core/config';

export const schema = coreSchema.extend({
  app: z.strictObject({ heading: z.string() }),
});

export const qaConfig = defineQaConfig({
  schema,
  base: { baseURL: 'http://127.0.0.1:4317/', app: { heading: 'QA Cortex compatibility' } },
  profiles: { local: {} },
});
