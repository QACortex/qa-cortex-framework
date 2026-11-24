import type { HtmlReporterOptions, JUnitReporterOptions, JsonReporterOptions, PlaywrightWorkerOptions, ReporterDescription } from '@playwright/test';

export type PresetName = 'local' | 'ci' | 'production';

/** The artifact settings a preset sets: Playwright's own `use` options, unchanged. */
export interface ArtifactSettings {
  readonly trace: PlaywrightWorkerOptions['trace'];
  readonly video: PlaywrightWorkerOptions['video'];
  readonly screenshot: PlaywrightWorkerOptions['screenshot'];
}

/**
 * A reporter you add or supply. A plain Playwright `ReporterDescription`, or the same wrapped
 * with `allowInProduction: true`, which the production preset requires for any reporter that
 * is not one of Playwright's console, JUnit or JSON reporters.
 */
export type ReporterEntry = ReporterDescription | { readonly reporter: ReporterDescription; readonly allowInProduction?: boolean | undefined };

export interface ReporterOptions {
  /** Options merged over the preset's HTML reporter options, or false to drop it. Not allowed in production. */
  readonly html?: HtmlReporterOptions | false | undefined;
  /** Options merged over the preset's JUnit reporter options, or false to drop it. */
  readonly junit?: JUnitReporterOptions | false | undefined;
  /** JSON reporter: off by default; true or options to add it (default file `reports/results.json`). */
  readonly json?: JsonReporterOptions | boolean | undefined;
  /** Reporters appended after the preset's own, in order (for example Allure). */
  readonly extra?: readonly ReporterEntry[] | undefined;
  /** Your complete reporter list instead of the preset's. Cannot be combined with html, junit, json or extra. */
  readonly replace?: readonly ReporterEntry[] | undefined;
}

export interface PresetOptions {
  /** Individual artifact settings that replace the preset's. The Production guard still checks the result. */
  readonly artifacts?: { readonly [K in keyof ArtifactSettings]?: ArtifactSettings[K] | undefined } | undefined;
  readonly reporters?: ReporterOptions | undefined;
  /**
   * Your Playwright `outputDir`, if you changed it (default "test-results"). Report files must
   * stay out of it: Playwright clears it at the start of every run.
   */
  readonly outputDir?: string | undefined;
  /** Environment used to choose `github` over `dot` in CI. Defaults to process.env. */
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
}

/** What qaPreset() returns: plain Playwright values to put in your own defineConfig(). A fresh copy every call. */
export interface QaPreset {
  readonly name: PresetName;
  /** For `reporter:` in defineConfig(). */
  readonly reporter: ReporterDescription[];
  /** For `use:` in defineConfig(): spread it, then add your own options. */
  readonly use: ArtifactSettings;
}

export interface SelectPresetOptions {
  /** Whether the selected profile is production. Pass the config's flag: `qa.production`. */
  readonly production: boolean;
  /** Whether this is a CI run. Default: the CI environment variable is set (Playwright's own convention). */
  readonly ci?: boolean | undefined;
  /** Environment to read QA_CORTEX_PRESET and CI from. Defaults to process.env. */
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
}
