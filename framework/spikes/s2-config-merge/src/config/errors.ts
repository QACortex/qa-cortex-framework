import type { z } from 'zod';
import { sourceOf, type Provenance } from './merge.js';

export interface ConfigIssue {
  /** Dot path, e.g. "timeouts.action". Empty string for the root. */
  readonly path: string;
  readonly message: string;
  /** Layer that set the value, or a "not set" explanation. Never contains the value itself. */
  readonly source: string;
}

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
  readonly profile: string | undefined;
  readonly issues: readonly ConfigIssue[];

  constructor(profile: string | undefined, issues: readonly ConfigIssue[]) {
    const head = profile === undefined ? 'Invalid QA Cortex config' : `Invalid QA Cortex config (profile "${profile}")`;
    super([`${head}:`, ...issues.map((i) => `  - ${i.path || '(root)'}: ${i.message} [${i.source}]`)].join('\n'));
    this.profile = profile;
    this.issues = issues;
  }
}

/**
 * Turn Zod issues into ConfigIssues with provenance.
 * Values are deliberately NOT included: config may hold secrets and this message ends up in CI logs.
 */
export function toConfigIssues(
  error: z.ZodError,
  provenance: Provenance,
  layerNames: readonly string[],
): ConfigIssue[] {
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
