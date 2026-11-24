import type { GuardOptions, GuardViolation, GuardedConfig, GuardedUse } from './types.js';

/** Reporters whose output embeds screenshots, videos and traces (ADR 0003). */
const ARTIFACT_REPORTERS = new Set(['html', 'blob']);
const FAILURE_SCREENSHOTS = new Set(['only-on-failure', 'on-first-failure']);

/**
 * The mode of a trace/video/screenshot setting: Playwright accepts a string or `{ mode }`.
 * Unset means Playwright's default, "off". Anything else is reported as unrecognised and
 * treated as unsafe (fail closed), so a future mode is never waved through.
 */
export function modeOf(setting: unknown): string {
  if (setting === undefined) return 'off';
  if (typeof setting === 'string') return setting;
  if (typeof setting === 'object' && setting !== null && 'mode' in setting && typeof setting.mode === 'string') return setting.mode;
  return '(unrecognised value)';
}

/** Reporter names from Playwright's `reporter` option: a name, or a list of `[name, options]`. */
export function reporterNames(reporter: unknown): string[] {
  if (typeof reporter === 'string') return [reporter];
  if (!Array.isArray(reporter)) return [];
  return reporter.flatMap((entry: unknown) => {
    if (typeof entry === 'string') return [entry];
    if (Array.isArray(entry) && typeof entry[0] === 'string') return [entry[0]];
    return [];
  });
}

/** Violations of one effective `use` (a project's, or the root's when there are no projects). */
export function checkUse(use: GuardedUse | undefined, project: string | undefined, options: Omit<GuardOptions, 'production'>): GuardViolation[] {
  const violations: GuardViolation[] = [];
  const trace = modeOf(use?.trace);
  if (trace !== 'off') violations.push({ setting: 'trace', project, found: trace, expected: '"off"', severity: 'error' });
  const video = modeOf(use?.video);
  if (video !== 'off') violations.push({ setting: 'video', project, found: video, expected: '"off"', severity: 'error' });
  const screenshot = modeOf(use?.screenshot);
  const screenshotOk = screenshot === 'off' || (options.allowScreenshotsOnFailure === true && FAILURE_SCREENSHOTS.has(screenshot));
  if (!screenshotOk) {
    const expected = options.allowScreenshotsOnFailure === true ? '"off" or "only-on-failure"' : '"off" (or set allowScreenshotsOnFailure for "only-on-failure")';
    violations.push({ setting: 'screenshot', project, found: screenshot, expected, severity: 'error' });
  }
  return violations;
}

/** Violations for the configured reporters. */
export function checkReporters(reporter: unknown, options: Omit<GuardOptions, 'production'>): GuardViolation[] {
  const mode = options.reporters ?? 'warn';
  if (mode === 'ignore') return [];
  return reporterNames(reporter)
    .filter((name) => ARTIFACT_REPORTERS.has(name))
    .map((name) => ({
      setting: 'reporter' as const,
      project: undefined,
      found: name,
      expected: 'no HTML or blob reporter (they embed screenshots and traces)',
      severity: mode === 'error' ? ('error' as const) : ('warning' as const),
    }));
}

/**
 * Pure check of a Playwright config for a production run: every project's effective `use`
 * (project `use` over root `use`), or the root `use` when there are no projects, plus the
 * reporters. Returns [] when `production` is false. Never changes the config.
 *
 * It sees only what is in the config object. CLI flags (`--trace on`) and `test.use()` are
 * caught at run time by productionGuardFixtures().
 */
export function checkProductionSafety(config: GuardedConfig, options: GuardOptions): GuardViolation[] {
  if (!options.production) return [];
  const projects = config.projects ?? [];
  const uses =
    projects.length === 0
      ? checkUse(config.use, undefined, options)
      : projects.flatMap((p, index) => checkUse({ ...config.use, ...p.use }, p.name || `#${index + 1}`, options));
  return [...uses, ...checkReporters(config.reporter, options)];
}

/** One readable line per violation. */
export function formatViolation(v: GuardViolation): string {
  const where = v.project === undefined || v.project === '' ? '' : `project "${v.project}": `;
  return v.setting === 'reporter'
    ? `${where}reporter "${v.found}" is configured; production expects ${v.expected}`
    : `${where}${v.setting} is "${v.found}"; production requires ${v.expected}`;
}
