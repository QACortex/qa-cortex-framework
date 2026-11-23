// Print context around a canary inside one zip entry: node ctx.mjs <zip> <entrySuffix> <canaryKey|literal> [width]
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
const [zip, suffix, key, width = '140'] = process.argv.slice(2);
const c = JSON.parse(readFileSync('out/canaries.json', 'utf8'));
const needle = c[key] ?? key;
const entries = unzipSync(new Uint8Array(readFileSync(zip)));
for (const [name, data] of Object.entries(entries)) {
  if (!name.endsWith(suffix)) continue;
  const text = Buffer.from(data).toString('utf8');
  let i = text.indexOf(needle), n = 0;
  while (i !== -1 && n < 3) {
    const w = Number(width);
    console.log(`[${name}] …${text.slice(Math.max(0, i - w), i + needle.length + 40).replace(/\s+/g, ' ')}…\n`);
    i = text.indexOf(needle, i + 1); n++;
  }
}
