// Random per-run passwords (also canaries: they must never appear in any trace).
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const pw = (role) => `QACpw${role}${randomBytes(6).toString('hex')}`;
const creds = {
  admin: { username: 'admin', password: pw('admin') },
  viewer: { username: 'viewer', password: pw('viewer') },
};
mkdirSync('out', { recursive: true });
writeFileSync('out/creds.json', JSON.stringify(creds, null, 2));
console.log('wrote out/creds.json');
