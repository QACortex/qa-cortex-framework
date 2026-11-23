import { z } from 'zod';

/**
 * Core config schema. Projects extend it with `coreSchema.extend({ ... })`, using the `z`
 * re-exported from `@qa-cortex/core/config` (a second Zod copy can break `.extend` typing).
 *
 * Every object is strict: unknown keys are errors at any depth. Prefer `z.strictObject` in
 * extensions too; plain `z.object` silently drops misspelled keys.
 *
 * `api` and `ai` are RESERVED namespaces (see RESERVED_NAMESPACES): placeholders that accept
 * anything. A later package replaces one with a real schema via `.extend({ api: apiSchema })`.
 */
export const coreSchema = z.strictObject({
  /** Base URL of the application under test for the selected profile. */
  baseURL: z.url(),
  /** Marks a production profile. Read by other modules (for example the Production guard). */
  production: z.boolean().default(false),
  timeouts: z
    .strictObject({
      action: z.number().int().positive().default(10_000),
      navigation: z.number().int().positive().default(30_000),
    })
    // Zod 4: `.default({})` would skip the inner defaults; `.prefault({})` parses `{}` through the schema.
    .prefault({}),
  api: z.unknown().optional(),
  ai: z.unknown().optional(),
});

export type CoreSchema = typeof coreSchema;
export type CoreConfig = z.output<CoreSchema>;

/**
 * Any schema whose output still satisfies the core contract, so other modules can rely on
 * `baseURL` and `production`. Extensions of `coreSchema` qualify; unrelated schemas do not.
 */
export type ConfigSchema = z.ZodType<CoreConfig, Record<string, unknown>>;
