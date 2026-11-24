// What a user project's config file would look like.
import { appendFileSync } from 'node:fs';
import { coreSchema, defineConfig, z, type ConfigOf } from '../src/config/index.js';

export const schema = coreSchema.extend({
  app: z.strictObject({ tenant: z.string() }),
});
export type AppConfig = ConfigOf<typeof schema>;

export const qaConfig = defineConfig({
  schema,
  base: { baseURL: 'http://localhost:3000', app: { tenant: 'acme' } },
  profiles: {
    local: {},
    staging: { baseURL: 'https://staging.example.test' },
  },
});

/** Spike probe: one line per process that evaluates the config file. */
export function recordEvaluation(where: string): void {
  const log = process.env.S2_EVAL_LOG;
  if (log) appendFileSync(log, `${where} pid=${process.pid} worker=${process.env.TEST_WORKER_INDEX ?? '-'}\n`);
}
