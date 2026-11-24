// Writes one unique canary per leak channel to out/canaries.json.
// Values are generated at run time and never appear in source, because traces and
// the HTML report embed test source code: a literal in a spec would "leak" trivially.
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

export const CHANNELS = [
  // browser input
  'fillPassword', 'fillText', 'typeText', 'evaluateArg', 'browserConsole', 'localStorage', 'selector',
  // transport / auth
  // (a form POST body is covered by the fill* channels: the form submits those inputs)
  'urlQuery', 'extraHeader', 'apiBearer', 'apiBody', 'basicAuthPass',
  'addCookie', 'serverCookie', 'serverRendered', 'responseBody',
  // test-runner surfaces
  'stepTitle', 'stepParam', 'expectMessage', 'expectExpected', 'testStdout', 'attachBody', 'annotation', 'envOnly',
  // failures
  'failTextValue', 'failPasswordValue', 'failCompare',
];

const canaries = Object.fromEntries(
  // Alphanumeric only: identical under URL-encoding and JSON-escaping, so plain search is exact.
  CHANNELS.map((c) => [c, `QAC${c}${randomBytes(6).toString('hex')}`]),
);
mkdirSync('out', { recursive: true });
writeFileSync('out/canaries.json', JSON.stringify(canaries, null, 2));
console.log(`wrote ${CHANNELS.length} canaries to out/canaries.json`);
