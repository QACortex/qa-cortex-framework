// Reporter lists per preset, the override rules and their validation (ADR 0009).
// Only chooses Playwright reporters and their options; never implements or wraps a reporter.
import { isAbsolute, relative, resolve } from 'node:path';
import type { PresetName, ReporterEntry, ReporterOptions } from './types.js';

/** Where report FILES go by default: outside Playwright's outputDir and the HTML report folder. */
export const DEFAULT_JUNIT_FILE = 'reports/junit.xml';
export const DEFAULT_JSON_FILE = 'reports/results.json';
/**
 * Playwright's default HTML folder name, set EXPLICITLY by the presets: Playwright resolves an
 * explicit reporter path from the config file's folder (like outputDir), but a missing one from
 * the nearest package.json's folder. Explicit keeps every preset path on the same base.
 */
export const DEFAULT_HTML_FOLDER = 'playwright-report';
const HTML = { open: 'never', outputFolder: DEFAULT_HTML_FOLDER } as const;
export const DEFAULT_OUTPUT_DIR = 'test-results';

/** Built-in reporters the production preset accepts without approval (console, JUnit, JSON). */
const PRODUCTION_NATIVE = new Set(['list', 'dot', 'line', 'github', 'junit', 'json', 'null']);
/** Never in the production preset, even when approved: they package screenshots, videos and traces (ADR 0003). */
const PRODUCTION_FORBIDDEN = new Set(['html', 'blob']);
/** Built-in reporters that may appear only once in a list. */
const BUILT_IN = new Set(['list', 'dot', 'line', 'github', 'html', 'junit', 'json', 'blob', 'null']);
/** Option names that hold an output location, for built-in and common third-party reporters. */
const PATH_FIELDS = ['outputFile', 'outputFolder', 'outputDir', 'resultsDir'];

type Description = readonly [string, unknown?];
interface Item {
  readonly description: Description;
  /** Supplied by the user through `extra` or `replace` (validated for production). */
  readonly supplied: boolean;
  readonly approved: boolean;
}

function isDescription(value: unknown): value is Description {
  return Array.isArray(value) && value.length >= 1 && value.length <= 2 && typeof value[0] === 'string';
}

function unwrap(entry: ReporterEntry, where: string, problems: string[]): Item | undefined {
  const description: unknown = Array.isArray(entry) ? entry : (entry as { reporter?: unknown }).reporter;
  if (!isDescription(description)) {
    problems.push(`${where}: expected a Playwright reporter description such as ['junit', { outputFile: 'reports/junit.xml' }]`);
    return undefined;
  }
  const approved = !Array.isArray(entry) && (entry as { allowInProduction?: unknown }).allowInProduction === true;
  return { description, supplied: true, approved };
}

function base(name: PresetName, env: Readonly<Record<string, string | undefined>>): Description[] {
  switch (name) {
    case 'local':
      return [['list'], ['html', { ...HTML }]];
    case 'ci':
      return [[env.GITHUB_ACTIONS === 'true' ? 'github' : 'dot'], ['html', { ...HTML }], ['junit', { outputFile: DEFAULT_JUNIT_FILE }]];
    case 'production':
      return [['list'], ['junit', { outputFile: DEFAULT_JUNIT_FILE }]];
  }
}

/**
 * Build the reporter list. Precedence (ADR 0009):
 *   1. `replace` given: it is the whole list; combining it with html, junit, json or extra is an error.
 *   2. Otherwise: the preset's list, then `html`/`junit` options (false drops, an object is
 *      merged over the preset's options, or adds the reporter if the preset has none), then
 *      `json`, then every `extra` entry in order.
 * The same production rules apply to `extra` and `replace`: html and blob are never allowed;
 * any reporter other than the console, JUnit and JSON ones needs `allowInProduction: true`.
 */
export function buildReporters(name: PresetName, options: ReporterOptions, env: Readonly<Record<string, string | undefined>>, problems: string[]): Description[] {
  const items: Item[] = [];
  if (options.replace !== undefined) {
    const combined = (['html', 'junit', 'json', 'extra'] as const).filter((k) => options[k] !== undefined);
    if (combined.length > 0) {
      problems.push(`reporters.replace cannot be combined with reporters.${combined.join(', reporters.')}: put every reporter in the replace list`);
    }
    options.replace.forEach((entry, i) => {
      const item = unwrap(entry, `reporters.replace[${i}]`, problems);
      if (item) items.push(item);
    });
  } else {
    const list = base(name, env);
    const apply = (reporter: 'html' | 'junit', value: Readonly<Record<string, unknown>> | false | undefined, fallback: Record<string, unknown>): void => {
      if (value === undefined) return;
      const index = list.findIndex((d) => d[0] === reporter);
      if (value === false) {
        if (index >= 0) list.splice(index, 1);
        return;
      }
      if (reporter === 'html' && name === 'production') {
        problems.push('reporters.html: the HTML reporter is not allowed in the production preset (it packages screenshots, videos and traces)');
        return;
      }
      const merged = { ...(index >= 0 ? (list[index]?.[1] as Record<string, unknown> | undefined) : fallback), ...value };
      if (index >= 0) list[index] = [reporter, merged];
      else list.push([reporter, merged]);
    };
    apply('html', options.html, { ...HTML });
    apply('junit', options.junit, { outputFile: DEFAULT_JUNIT_FILE });
    if (options.json !== undefined && options.json !== false) {
      list.push(['json', { outputFile: DEFAULT_JSON_FILE, ...(options.json === true ? {} : options.json) }]);
    }
    for (const d of list) items.push({ description: d, supplied: false, approved: false });
    (options.extra ?? []).forEach((entry, i) => {
      const item = unwrap(entry, `reporters.extra[${i}]`, problems);
      if (item) items.push(item);
    });
  }

  if (name === 'production') {
    for (const item of items.filter((x) => x.supplied)) {
      const reporter = item.description[0];
      if (PRODUCTION_FORBIDDEN.has(reporter)) {
        problems.push(`reporter "${reporter}" is not allowed in the production preset, even with allowInProduction (it packages screenshots, videos and traces)`);
      } else if (!PRODUCTION_NATIVE.has(reporter) && !item.approved) {
        problems.push(
          `reporter "${reporter}" needs { reporter: [...], allowInProduction: true } in the production preset: ` +
            'reporters other than the console, JUnit and JSON ones may copy screenshots, traces or test output into their own results',
        );
      }
    }
  }

  const seen = new Set<string>();
  for (const { description } of items) {
    const reporter = description[0];
    if (BUILT_IN.has(reporter) && seen.has(reporter)) problems.push(`reporter "${reporter}" appears more than once; configure it once (reporters.${reporter} or one list entry)`);
    seen.add(reporter);
  }
  return items.map((x) => x.description);
}

function inside(path: string, folder: string): boolean {
  const rel = relative(folder, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * Output locations must not clash: none inside Playwright's outputDir (cleared at the start of
 * every run), none inside an HTML report folder (replaced by the HTML reporter), no HTML folder
 * overlapping outputDir, and no two reporters writing the same path. Paths are compared as
 * Playwright resolves them: relative to the same directory (the config file's).
 */
export function checkReportPaths(reporters: readonly Description[], outputDir: string, problems: string[]): void {
  const at = (p: string): string => resolve('/qa-cortex-config-dir', p);
  const out = at(outputDir);
  const htmlFolders = reporters
    .filter((d) => d[0] === 'html')
    .map((d) => {
      const folder = (d[1] as { outputFolder?: unknown } | undefined)?.outputFolder;
      return typeof folder === 'string' ? folder : DEFAULT_HTML_FOLDER;
    });
  for (const folder of htmlFolders) {
    if (inside(at(folder), out) || inside(out, at(folder))) {
      problems.push(`HTML report folder "${folder}" and outputDir "${outputDir}" overlap; keep them apart`);
    }
  }
  const written = new Map<string, string>();
  for (const [reporter, options] of reporters) {
    if (typeof options !== 'object' || options === null) continue;
    for (const field of PATH_FIELDS) {
      const value = (options as Record<string, unknown>)[field];
      if (typeof value !== 'string') continue;
      const label = `reporter "${reporter}" ${field} "${value}"`;
      const target = at(value);
      if (reporter !== 'html' && inside(target, out)) {
        problems.push(`${label} is inside outputDir "${outputDir}", which Playwright clears at the start of every run`);
      }
      if (reporter !== 'html') {
        for (const folder of htmlFolders) {
          if (inside(target, at(folder))) problems.push(`${label} is inside the HTML report folder "${folder}", which the HTML reporter replaces`);
        }
      }
      const other = written.get(target);
      if (other !== undefined) problems.push(`${label} is also written by ${other}`);
      else written.set(target, `reporter "${reporter}"`);
    }
  }
}
