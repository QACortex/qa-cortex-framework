// Deliberate violations so we can tell the linter actually ran with type information.
import { ConfigError } from '@spike/a/config';

export type E = ConfigError; // consistent-type-imports should flag the value import above

async function work(): Promise<number> {
  return 1;
}

export function fireAndForget(): void {
  work(); // no-floating-promises needs the type checker to flag this
}
