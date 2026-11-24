// Did any login reach a trace? Searches every trace.zip of a run for the role passwords.
// Usage: node scan-pw.mjs <variant>
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync } from 'fflate';

const variant = process.argv[2];
const creds = JSON.parse(readFileSync('out/creds.json', 'utf8'));
const needles = Object.values(creds).flatMap((c) => [c.password, Buffer.from(c.password).toString('base64').slice(2, -2)]);
let traces = 0, hits = 0;
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!n.endsWith('.zip')) continue;
    traces++;
    for (const [entry, data] of Object.entries(unzipSync(new Uint8Array(readFileSync(p))))) {
      const buf = Buffer.from(data);
      for (const s of needles) if (buf.includes(s)) { hits++; console.log(`  password in ${p}!${entry}`); }
    }
  }
})(join('out', variant, 'test-results'));
console.log(`${variant}: scanned ${traces} traces, ${hits} password hits`);
