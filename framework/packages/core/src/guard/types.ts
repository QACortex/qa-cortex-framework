/** The artifact settings the guard reads. Structural, so any Playwright config or project `use` fits. */
export interface GuardedUse {
  readonly trace?: unknown;
  readonly video?: unknown;
  readonly screenshot?: unknown;
}

/** The parts of a Playwright config the static check reads. `defineConfig()` results fit. */
export interface GuardedConfig {
  readonly use?: GuardedUse | undefined;
  readonly projects?: readonly { readonly name?: string | undefined; readonly use?: GuardedUse | undefined }[] | undefined;
  readonly reporter?: unknown;
}

export interface GuardOptions {
  /** Whether this run targets production. Pass the config's flag: `qa.production`. When false, nothing is checked. */
  readonly production: boolean;
  /** Accept `screenshot: 'only-on-failure'` (or `'on-first-failure'`) in production. Default false. */
  readonly allowScreenshotsOnFailure?: boolean | undefined;
  /** HTML and blob reporters embed screenshots and traces. Default "warn". */
  readonly reporters?: 'warn' | 'error' | 'ignore' | undefined;
}

export interface AssertProductionSafeOptions extends GuardOptions {
  /**
   * Receives each warning. Default: console.warn, in the main Playwright process only
   * (the config file is also loaded by every worker).
   */
  readonly warn?: ((message: string) => void) | undefined;
}

/** Options for productionGuardFixtures(); `production` comes from `qaConfig.production`. */
export type RuntimeGuardOptions = Omit<GuardOptions, 'production'>;

export type GuardedSetting = 'trace' | 'video' | 'screenshot' | 'reporter';

/** One unsafe setting. Holds setting names and modes only, never config values. */
export interface GuardViolation {
  readonly setting: GuardedSetting;
  /** Project name; undefined for a config without projects. */
  readonly project: string | undefined;
  /** The mode or reporter found. */
  readonly found: string;
  /** What production requires. */
  readonly expected: string;
  readonly severity: 'error' | 'warning';
}
