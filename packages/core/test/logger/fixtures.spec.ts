// loggerFixtures(): runs a nested Playwright project (test/fixtures/pw-logger) with three
// attachment policies, retries and traces, then inspects every artifact it produced.
import { expect, test } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { REDACTED, type LogRecord } from '@qa-cortex/core/logger';
import { runNestedPlaywright } from '../helpers/nested-playwright.js';
import { readZip } from '../helpers/zip.js';

const projectDir = join(import.meta.dirname, '..', 'fixtures', 'pw-logger');

interface JsonResult {
  retry: number;
  status: string;
  stdout: { text?: string }[];
  stderr: { text?: string }[];
  attachments: { name: string; body?: string }[];
}
interface Attempt {
  project: string;
  title: string;
  result: JsonResult;
}

/** Flatten Playwright's JSON report into one entry per test attempt. */
function attempts(report: unknown): Attempt[] {
  const out: Attempt[] = [];
  const walk = (suite: { suites?: unknown[]; specs?: { title: string; tests: { projectName: string; results: JsonResult[] }[] }[] }): void => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests) for (const result of t.results) out.push({ project: t.projectName, title: spec.title, result });
    }
    for (const child of suite.suites ?? []) walk(child as typeof suite);
  };
  for (const suite of (report as { suites: unknown[] }).suites) walk(suite as Parameters<typeof walk>[0]);
  return out;
}

const logAttachment = (a: Attempt): string | undefined => {
  const att = a.result.attachments.find((x) => x.name === 'qa-cortex-log.jsonl');
  return att?.body === undefined ? undefined : Buffer.from(att.body, 'base64').toString('utf8');
};
const records = (body: string): LogRecord[] => body.trim().split('\n').map((line) => JSON.parse(line) as LogRecord);
const stdoutOf = (a: Attempt): string => [...a.result.stdout, ...a.result.stderr].map((s) => s.text ?? '').join('');

async function traceTexts(dir: string): Promise<string[]> {
  const files = (await readdir(dir, { recursive: true })).filter((f) => f.endsWith('trace.zip'));
  const texts: string[] = [];
  for (const file of files) for (const entry of readZip(await readFile(join(dir, file)))) texts.push(entry.data.toString('utf8'));
  return texts;
}

test.describe('loggerFixtures()', () => {
  test.describe.configure({ timeout: 120_000 });

  test('levels, attachment policies, metadata, retries and redaction across every artifact', async ({}, testInfo) => {
    const secret = `QACsecret${randomBytes(8).toString('hex')}`;
    const outputDir = testInfo.outputPath('nested');
    const reportFile = testInfo.outputPath('report.json');
    const { code, output } = await runNestedPlaywright(projectDir, { QAC_TEST_SECRET: secret, QAC_JSON_REPORT: reportFile }, outputDir);

    // The run: 3 projects x (1 passing + 1 flaky) tests. Flaky tests don't fail the run.
    expect(output).toContain('3 passed');
    expect(output).toContain('3 flaky');
    expect(code).toBe(0);

    const report = JSON.parse(await readFile(reportFile, 'utf8')) as unknown;
    const all = attempts(report);
    const find = (project: string, titlePart: string, retry: number): Attempt => {
      const hit = all.find((a) => a.project === project && a.title.includes(titlePart) && a.result.retry === retry);
      if (!hit) throw new Error(`no attempt ${project} / ${titlePart} / retry ${retry}`);
      return hit;
    };

    // ---- attachment policy
    expect(logAttachment(find('default', 'every level', 0)), 'on-failure: passing test has no attachment').toBeUndefined();
    expect(logAttachment(find('default', 'fails on the first', 0)), 'on-failure: failed attempt is attached').toBeDefined();
    expect(logAttachment(find('default', 'fails on the first', 1)), 'on-failure: passing retry is not').toBeUndefined();
    expect(logAttachment(find('always', 'every level', 0))).toBeDefined();
    expect(logAttachment(find('always', 'fails on the first', 0))).toBeDefined();
    expect(logAttachment(find('always', 'fails on the first', 1))).toBeDefined();
    for (const a of all.filter((x) => x.project === 'off')) expect(logAttachment(a)).toBeUndefined();

    // ---- records: metadata, retry, context, redaction
    const always = records(logAttachment(find('always', 'every level', 0)) ?? '');
    expect(always.map((r) => r.level)).toEqual(['debug', 'info', 'warn']); // qaLogLevel: debug
    const info = always[1];
    expect(info?.msg).toBe(`signing in with ${REDACTED}`);
    expect(info?.context).toEqual({ page: 'login', session: `sid-${REDACTED}` });
    expect(info?.data).toEqual({ profile: 'local', password: REDACTED, url: `https://app.test/login?pw=${REDACTED}` });
    expect(info?.test).toMatchObject({
      title: 'logs at every level, with the secret in message, data and context',
      project: 'always',
      retry: 0,
      worker: expect.any(Number),
      parallelIndex: expect.any(Number),
      testId: expect.any(String),
    });
    expect(info?.test?.titlePath).toContain('logs at every level, with the secret in message, data and context');
    const retried = records(logAttachment(find('always', 'fails on the first', 1)) ?? '');
    expect(retried[0]).toMatchObject({ msg: `attempt 1 using ${REDACTED}`, test: { retry: 1, project: 'always' } });

    // ---- console output: level filtering per project, captured per test by Playwright
    expect(stdoutOf(find('default', 'every level', 0))).not.toContain('[debug]');
    expect(stdoutOf(find('always', 'every level', 0))).toContain(`[debug] [page=login session=sid-${REDACTED}] debug detail`);
    expect(stdoutOf(find('default', 'every level', 0))).toContain(`[info] [page=login session=sid-${REDACTED}] signing in with ${REDACTED}`);
    expect(stdoutOf(find('default', 'every level', 0))).toContain('[warn]');

    // ---- the secret appears NOWHERE (plain or URL-encoded); positive controls prove we looked
    const encoded = encodeURIComponent(secret);
    const decodedAttachments = all.map(logAttachment).filter((b): b is string => b !== undefined).join('\n');
    const traces = await traceTexts(outputDir);
    expect(traces.length).toBeGreaterThan(0);
    const places: Record<string, string> = {
      'runner output': output,
      'JSON report (raw)': JSON.stringify(report),
      'log attachments (decoded)': decodedAttachments,
      'traces (unzipped)': traces.join('\n'),
    };
    for (const [place, text] of Object.entries(places)) {
      expect(text, `${place} must not contain the secret`).not.toContain(secret);
      expect(text, `${place} must not contain the URL-encoded secret`).not.toContain(encoded);
    }
    expect(places['traces (unzipped)'], 'control: our redacted log line reached the trace').toContain(`signing in with ${REDACTED}`);
    expect(places['log attachments (decoded)'], 'control: attachments were read').toContain(REDACTED);
  });
});
