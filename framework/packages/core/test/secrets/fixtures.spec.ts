// secretsFixtures(): runs a nested Playwright project (test/fixtures/pw-secrets) in two profiles.
// Correct compositions must work and redact; incorrect ones must fail BEFORE any test body runs
// (qaSecretsCheck). No secret value may appear in the output, the JSON report, the log
// attachments or the traces, for passing and failing runs alike.
import { expect, test } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { REDACTED } from '@qa-cortex/core/logger';
import { runNestedPlaywright } from '../helpers/nested-playwright.js';
import { readZip } from '../helpers/zip.js';

const projectDir = join(import.meta.dirname, '..', 'fixtures', 'pw-secrets');

interface Result {
  status: string;
  errors: { message?: string }[];
  stdout: { text?: string }[];
  attachments: { name: string; body?: string }[];
}
interface Attempt {
  file: string;
  project: string;
  title: string;
  result: Result;
}

function attempts(report: unknown): Attempt[] {
  const out: Attempt[] = [];
  type Suite = { file?: string; suites?: Suite[]; specs?: { title: string; file: string; tests: { projectName: string; results: Result[] }[] }[] };
  const walk = (suite: Suite): void => {
    for (const spec of suite.specs ?? []) for (const t of spec.tests) for (const result of t.results) out.push({ file: spec.file, project: t.projectName, title: spec.title, result });
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of (report as { suites: Suite[] }).suites) walk(suite);
  return out;
}

const synthetic = (label: string): string => `${label}-${randomBytes(6).toString('hex')}`;

/** Every text artifact of a nested run: output, JSON report, decoded log attachments, unzipped traces. */
async function artifacts(output: string, outputDir: string, report: string): Promise<Record<string, string>> {
  const decoded = attempts(JSON.parse(report))
    .flatMap((a) => a.result.attachments)
    .filter((a) => a.name === 'qa-cortex-log.jsonl' && a.body !== undefined)
    .map((a) => Buffer.from(a.body ?? '', 'base64').toString('utf8'));
  const traces: string[] = [];
  for (const file of (await readdir(outputDir, { recursive: true })).filter((f) => f.endsWith('trace.zip'))) {
    for (const entry of readZip(await readFile(join(outputDir, file)))) traces.push(entry.data.toString('utf8'));
  }
  return { 'runner output': output, 'JSON report': report, 'log attachments': decoded.join('\n'), traces: traces.join('\n') };
}

function expectNoValues(places: Record<string, string>, values: Record<string, string>): void {
  for (const [place, text] of Object.entries(places)) {
    for (const [name, value] of Object.entries(values)) {
      expect(text, `${place} must not contain ${name}`).not.toContain(value);
      expect(text, `${place} must not contain ${name} (URL-encoded)`).not.toContain(encodeURIComponent(value));
    }
  }
}

test.describe('secretsFixtures()', () => {
  test.describe.configure({ timeout: 120_000 });

  test('correct compositions, secrets without the logger and an adding override: profile-aware and redacted everywhere', async ({}, testInfo) => {
    const values = {
      QAC_TEST_ADMIN_PASSWORD: synthetic('admin'),
      QAC_TEST_LOCAL_TOKEN: synthetic('local'),
      QAC_TEST_STAGING_TOKEN: synthetic('staging'),
      QAC_TEST_EXTRA_VALUE: synthetic('extra'),
    };
    const outputDir = testInfo.outputPath('nested');
    const reportFile = testInfo.outputPath('report.json');
    const { code, output } = await runNestedPlaywright(projectDir, { ...values, QAC_JSON_REPORT: reportFile }, outputDir, ['good.spec.ts']);

    expect(output).toContain('10 passed'); // (4 logger compositions + secretsOnly) x 2 profiles
    expect(code).toBe(0);
    for (const composition of ['chained', 'spread', 'merged', 'userAdds']) {
      expect(output).toContain(`QAC_SECRETS ${composition} revealed=${REDACTED} token=${REDACTED} basic=unset`);
    }
    expect(output).toContain('QAC_SECRETS secretsOnly names=adminPassword,apiToken');

    const places = await artifacts(output, outputDir, await readFile(reportFile, 'utf8'));
    expectNoValues(places, values);
    expect(places['log attachments'], 'control: attachments were read').toContain(`revealed=${REDACTED}`);
    expect(places.traces, 'control: traces were read').toContain(`revealed=${REDACTED}`);
  });

  test('an optional secret, when set, is loaded and redacted like the others', async ({}, testInfo) => {
    const values = {
      QAC_TEST_ADMIN_PASSWORD: synthetic('admin'),
      QAC_TEST_LOCAL_TOKEN: synthetic('local'),
      QAC_TEST_STAGING_TOKEN: synthetic('staging'),
      QAC_TEST_BASIC_AUTH: synthetic('basic'),
    };
    const outputDir = testInfo.outputPath('nested');
    const reportFile = testInfo.outputPath('report.json');
    const { code, output } = await runNestedPlaywright(projectDir, { ...values, QAC_JSON_REPORT: reportFile }, outputDir, ['good.spec.ts']);
    expect(output).toContain('10 passed');
    expect(code).toBe(0);
    expect(output).toContain(`QAC_SECRETS chained revealed=${REDACTED} token=${REDACTED} basic=${REDACTED}`);
    expectNoValues(await artifacts(output, outputDir, await readFile(reportFile, 'utf8')), values);
  });

  test('incorrect compositions fail before any test body runs, naming secrets but never values', async ({}, testInfo) => {
    const values = {
      QAC_TEST_ADMIN_PASSWORD: synthetic('admin'),
      QAC_TEST_LOCAL_TOKEN: synthetic('local'),
      QAC_TEST_STAGING_TOKEN: synthetic('staging'),
    };
    const outputDir = testInfo.outputPath('nested');
    const reportFile = testInfo.outputPath('report.json');
    const { code, output } = await runNestedPlaywright(projectDir, { ...values, QAC_JSON_REPORT: reportFile }, outputDir, ['wrong-']);

    expect(code).not.toBe(0);
    expect(output).not.toContain('QAC_WRONG_RAN'); // no test body ran
    const report = await readFile(reportFile, 'utf8');
    const all = attempts(JSON.parse(report));
    const files = ['wrong-chain.spec.ts', 'wrong-spread.spec.ts', 'wrong-merge.spec.ts', 'wrong-user-drops.spec.ts'];
    expect(all.map((a) => `${a.file}/${a.project}`).sort()).toEqual(files.flatMap((f) => [`${f}/local`, `${f}/staging`]).sort());
    for (const a of all) {
      expect(a.result.status, `${a.file} ${a.project}`).toBe('failed');
      const message = a.result.errors.map((e) => e.message ?? '').join('\n');
      expect(message).toContain(`SecretsError: Missing or invalid QA Cortex secrets (profile "${a.project}")`);
      expect(message).toContain('adminPassword, apiToken: missing from qaSecrets, so qaLog would not redact it');
      expect(message).toContain('Apply secretsFixtures() AFTER loggerFixtures()');
    }
    expectNoValues(await artifacts(output, outputDir, report), values);
  });

  test('a missing required secret fails the worker with SecretsError, naming the variable only', async ({}, testInfo) => {
    const outputDir = testInfo.outputPath('nested');
    const { code, output } = await runNestedPlaywright(
      projectDir,
      { QAC_TEST_LOCAL_TOKEN: 'present-local-token', QAC_TEST_STAGING_TOKEN: 'present-staging-token', QAC_JSON_REPORT: testInfo.outputPath('report.json') },
      outputDir,
      ['good.spec.ts'],
    );
    expect(code).not.toBe(0);
    expect(output).toContain('SecretsError: Missing or invalid QA Cortex secrets (profile "local")');
    expect(output).toContain('adminPassword: environment variable QAC_TEST_ADMIN_PASSWORD is not set');
    expect(output).not.toContain('present-local-token');
    expect(output).not.toContain('present-staging-token');
  });
});
