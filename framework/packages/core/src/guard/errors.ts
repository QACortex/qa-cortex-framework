import { formatViolation } from './check.js';
import type { GuardViolation } from './types.js';

/**
 * Thrown by assertProductionSafe() and the qaProductionGuard fixture when a production run
 * would record artifacts that can contain secrets (ADR 0003). Lists every violation.
 */
export class ProductionGuardError extends Error {
  override readonly name = 'ProductionGuardError';
  declare readonly violations: readonly GuardViolation[];

  constructor(violations: readonly GuardViolation[]) {
    super(
      [
        'QA Cortex production guard: this production run would record artifacts that can contain secrets (ADR 0003).',
        ...violations.map((v) => `  - ${formatViolation(v)}`),
      ].join('\n'),
    );
    Object.defineProperty(this, 'violations', { value: Object.freeze([...violations]), enumerable: false });
  }
}
