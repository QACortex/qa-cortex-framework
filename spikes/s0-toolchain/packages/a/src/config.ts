// Exercises declaration emit for generics, overloads, classes and inferred return types.
export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

export interface Definition<T> {
  base: T;
  profiles: Record<string, DeepPartial<T>>;
}

export class ConfigError extends Error {
  readonly issues: readonly string[];
  constructor(issues: string[]) {
    super(issues.join('\n'));
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

export function defineConfig<T>(def: Definition<T>): Definition<T> {
  return def;
}

// Inferred (unannotated) return type: declaration emit must spell it out.
export function loadConfig<T>(def: Definition<T>, profile: string) {
  const overlay = def.profiles[profile];
  if (!overlay) throw new ConfigError([`unknown profile "${profile}"`]);
  return Object.freeze({ ...def.base, ...overlay, profile }) ;
}
