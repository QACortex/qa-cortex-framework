/**
 * Top-level config sections owned by future packages (`api` for API testing, `ai` for
 * AI agents). Core accepts any value there and never validates or interprets it; those
 * packages bring their own schemas via `coreSchema.extend({ api: ... })` (ADR 0002).
 * Core must not import API or AI code.
 */
export const RESERVED_NAMESPACES: readonly ['api', 'ai'] = Object.freeze(['api', 'ai'] as const);

/** Name of a reserved config namespace. */
export type ReservedNamespace = (typeof RESERVED_NAMESPACES)[number];

/** True when `key` is a top-level config section reserved for a future package. */
export function isReservedNamespace(key: string): key is ReservedNamespace {
  return (RESERVED_NAMESPACES as readonly string[]).includes(key);
}
