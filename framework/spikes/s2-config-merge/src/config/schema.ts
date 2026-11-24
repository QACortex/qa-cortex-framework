import { z } from 'zod';

/**
 * Core config schema. Users extend it with `coreSchema.extend({ ... })`.
 *
 * `api` and `ai` are RESERVED namespaces: placeholders that core never validates.
 * Phase 2/3 packages replace them via `.extend({ api: apiSchema })`, which overrides the key.
 */
export const coreSchema = z.strictObject({
  baseURL: z.url(),
  /** Read by the Production guard (module 2). */
  production: z.boolean().default(false),
  timeouts: z
    .strictObject({
      action: z.number().int().positive().default(10_000),
      navigation: z.number().int().positive().default(30_000),
    })
    // Zod 4: `.default({})` would skip inner defaults; `.prefault({})` parses `{}` through the schema.
    .prefault({}),
  api: z.unknown().optional(),
  ai: z.unknown().optional(),
});

export type CoreSchema = typeof coreSchema;
export type CoreConfig = z.output<CoreSchema>;

/** Any schema whose output still satisfies the core contract (so other modules can rely on it). */
export type ConfigSchema = z.ZodType<CoreConfig, Record<string, unknown>>;
