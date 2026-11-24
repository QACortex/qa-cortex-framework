/**
 * Thrown by selectPreset() and qaPreset() for an invalid preset choice, a reporter the
 * production preset does not allow, conflicting reporter options or clashing output paths.
 * Lists every problem at once.
 */
export class PresetError extends Error {
  override readonly name = 'PresetError';
  declare readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(['Invalid QA Cortex preset options:', ...problems.map((p) => `  - ${p}`)].join('\n'));
    Object.defineProperty(this, 'problems', { value: Object.freeze([...problems]), enumerable: false });
  }
}
