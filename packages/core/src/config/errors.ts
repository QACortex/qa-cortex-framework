import type { z } from 'zod';
import { sourceOf, type Provenance } from './merge.js';

export interface ConfigIssue {
  /** Dot path, e.g. "api.retries". Empty string for the root. */
  readonly path: string;
  readonly message: string;
  /** Layer that set the value, or a "not set" explanation. Never contains the value itself. */
  readonly source: string;
}

/**
 * Thrown by loadConfig(). The message lists every issue with the layer that caused it.
 * Messages never include config values: config may hold secrets and ends up in CI logs.
 */
export class ConfigError extends Error {
  override readonly name = 'ConfigError';
  /** Profile being loaded when the error occurred. */
  declare readonly profile: string;
  declare readonly issues: readonly ConfigIssue[];

  constructor(profile: string, issues: readonly ConfigIssue[]) {
    super(
      [`Invalid QA Cortex config (profile "${profile}"):`, ...issues.map((i) => `  - ${i.path || '(root)'}: ${i.message} [${i.source}]`)].join('\n'),
    );
    // Non-enumerable, so test runners that print an error's own properties show the
    // readable message once instead of a second, raw dump of the same data.
    Object.defineProperties(this, {
      profile: { value: profile, enumerable: false },
      issues: { value: Object.freeze([...issues]), enumerable: false },
    });
  }
}

/** Turn Zod issues into ConfigIssues with provenance. Values are deliberately not included. */
export function toConfigIssues(error: z.ZodError, provenance: Provenance, layerNames: readonly string[]): ConfigIssue[] {
  const notSet = `not set in ${layerNames.join(', ')}`;
  const issues: ConfigIssue[] = [];
  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      // Zod reports these on the parent; split per key so each one gets its own source.
      for (const key of issue.keys) {
        const path = [...issue.path, key];
        issues.push({
          path: path.map(String).join('.'),
          message: 'unknown key (typo, or missing from your schema extension?)',
          source: sourceOf(provenance, path) ?? notSet,
        });
      }
      continue;
    }
    issues.push({
      path: issue.path.map(String).join('.'),
      message: issue.message,
      source: sourceOf(provenance, issue.path) ?? notSet,
    });
  }
  return issues;
}
