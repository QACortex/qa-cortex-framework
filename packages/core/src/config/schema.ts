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
 *
 * Deliberately no Playwright settings (timeouts, retries, workers...): Playwright owns those.
 * A project that wants them per profile adds its own field and maps it into `use` explicitly.
 * For nested objects with defaults, use `.prefault({})`: in Zod 4, `.default({})` skips the
 * inner defaults.
 */
export const coreSchema = z.strictObject({
  /** Base URL of the application under test for the selected profile. Map it into `use.baseURL`. */
  baseURL: z.url(),
  /** Marks a production profile. Read by other modules (for example the Production guard). */
  production: z.boolean().default(false),
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
