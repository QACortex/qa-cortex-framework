// Scans every artifact of a run for every canary and prints a channel x artifact matrix.
// Usage: node scan.mjs <variant>   (reads out/canaries.json and out/<variant>/**)
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { unzipSync } from 'fflate';

const variant = process.argv[2] ?? 'baseline';
const root = join('out', variant);
const canaries = JSON.parse(readFileSync('out/canaries.json', 'utf8'));

// ---- needles: plain, plus base64 at all 3 byte alignments (inner chars only) ----
function base64Needles(s) {
  const out = [];
  for (let pad = 0; pad < 3; pad++) {
    const b64 = Buffer.from('x'.repeat(pad) + s).toString('base64');
    // Drop chars influenced by the padding prefix and the unknown suffix.
    const start = Math.ceil((pad * 4) / 3) + 1;
    const end = Math.floor(((pad + s.length) * 4) / 3) - 1;
    if (end - start >= 12) out.push(b64.slice(start, end));
  }
  return out;
}
const needles = Object.entries(canaries).map(([channel, value]) => ({
  channel,
  forms: [
    { kind: 'plain', bytes: Buffer.from(value) },
    { kind: 'utf16', bytes: Buffer.from(value, 'utf16le') },
    ...base64Needles(value).map((b) => ({ kind: 'base64', bytes: Buffer.from(b) })),
    ...(channel === 'basicAuthPass'
      ? [{ kind: 'basic-auth', bytes: Buffer.from(Buffer.from(`qa-user:${value}`).toString('base64')) }]
      : []),
  ],
}));

// ---- artifact classification ----
function classify(path) {
  const p = path.split(sep).join('/');
  if (p.startsWith('stdout.log')) return 'runner stdout';
  if (p.startsWith('results.json')) return 'json reporter';
  if (p.startsWith('junit.xml')) return 'junit reporter';
  if (p.startsWith('blob-report/')) return 'blob report';
  if (p.startsWith('html-report/')) return p.includes('trace.zip') || p.includes('/data/') && p.match(/\.zip!/) ? 'html report (embedded trace/data)' : 'html report';
  if (p.includes('trace.zip!')) {
    const inner = p.split('trace.zip!')[1] ?? '';
    if (inner.endsWith('.network')) return 'trace: network log';
    if (inner.endsWith('.trace')) return 'trace: actions/events';
    if (inner.endsWith('.stacks')) return 'trace: stacks';
    if (inner.startsWith('resources/src@')) return 'trace: sources';
    if (inner.startsWith('resources/')) return 'trace: resources (bodies/snapshots)';
    return 'trace: other';
  }
  if (p.endsWith('error-context.md')) return 'error-context.md';
  if (p.endsWith('state.json')) return 'storageState file';
  if (p.endsWith('.png')) return 'screenshot (binary)';
  if (p.endsWith('.webm')) return 'video (binary)';
  return `other: ${p.split('/').pop()}`;
}

// ---- walk files, recursing into zips and the HTML report's base64 zip ----
const hits = new Map(); // channel -> Map(artifact -> Set(detail))
function record(channel, artifact, detail) {
  if (!hits.has(channel)) hits.set(channel, new Map());
  const m = hits.get(channel);
  if (!m.has(artifact)) m.set(artifact, new Set());
  m.get(artifact).add(detail);
}

function scanBuffer(buf, path) {
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  if (isZip) {
    let entries;
    try { entries = unzipSync(new Uint8Array(buf)); } catch { entries = {}; }
    for (const [name, data] of Object.entries(entries)) scanBuffer(Buffer.from(data), `${path}!${name}`);
    return;
  }
  // HTML report embeds its data as a base64 zip inside index.html.
  const text = buf.toString('latin1');
  const m = text.match(/data:application\/zip;base64,([A-Za-z0-9+/=]+)/);
  if (m) scanBuffer(Buffer.from(m[1], 'base64'), `${path}!embedded.zip`);
  for (const { channel, forms } of needles) {
    for (const f of forms) {
      if (buf.indexOf(f.bytes) !== -1) record(channel, classify(path), `${f.kind} @ ${path}`);
    }
  }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else scanBuffer(readFileSync(full), relative(root, full));
  }
}
walk(root);

// ---- report ----
const artifacts = [...new Set([...hits.values()].flatMap((m) => [...m.keys()]))].sort();
const lines = [];
lines.push(`# Leak matrix (${variant})`, '');
lines.push(`| channel | ${artifacts.join(' | ')} |`);
lines.push(`|---|${artifacts.map(() => '---').join('|')}|`);
for (const { channel } of needles) {
  const m = hits.get(channel);
  lines.push(`| ${channel} | ${artifacts.map((a) => (m?.has(a) ? 'LEAK' : '')).join(' | ')} |`);
}
const clean = needles.filter(({ channel }) => !hits.has(channel)).map((n) => n.channel);
lines.push('', `Not found anywhere: ${clean.length ? clean.join(', ') : '(none)'}`, '', '## Details', '');
for (const [channel, m] of hits) {
  lines.push(`- **${channel}**`);
  for (const [a, details] of m) lines.push(`  - ${a}: ${[...details].slice(0, 4).join('; ')}${details.size > 4 ? ` (+${details.size - 4} more)` : ''}`);
}
writeFileSync(join('out', `leak-matrix-${variant}.md`), lines.join('\n') + '\n');
console.log(lines.join('\n'));
