// App under test: cookie sessions for the browser, bearer tokens for the API, both expiring.
// Env: PORT (4174), SESSION_TTL_MS / TOKEN_TTL_MS (600000), LOGIN_DELAY_MS (300, widens race windows).
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 4174);
const SESSION_TTL = Number(process.env.SESSION_TTL_MS ?? 600_000);
const TOKEN_TTL = Number(process.env.TOKEN_TTL_MS ?? 600_000);
const LOGIN_DELAY = Number(process.env.LOGIN_DELAY_MS ?? 300);
const STATS = process.env.STATS_FILE ?? 'out/stats.json';

const creds = JSON.parse(readFileSync('out/creds.json', 'utf8'));
const sessions = new Map(); // sid -> { user, exp }
const tokens = new Map(); // token -> { user, exp }
const stats = { formLogins: { admin: 0, viewer: 0 }, tokenLogins: { admin: 0, viewer: 0 }, rejected401: 0, badLogins: 0 };
const saveStats = () => writeFileSync(STATS, JSON.stringify(stats));
saveStats();

const check = (u, p) => Object.values(creds).some((c) => c.username === u && c.password === p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readBody = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });
const html = (s) => `<!doctype html><html><body>${s}</body></html>`;

function userFromCookie(req) {
  const sid = /(?:^|;\s*)session=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
  const s = sid && sessions.get(sid);
  return s && s.exp > Date.now() ? s.user : undefined;
}
function userFromBearer(req) {
  const t = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
  const s = t && tokens.get(t);
  return s && s.exp > Date.now() ? s.user : undefined;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const send = (status, type, body, headers = {}) => { res.writeHead(status, { 'content-type': type, ...headers }); res.end(body); };
  const route = `${req.method} ${url.pathname}`;

  if (route === 'GET /login') {
    return send(200, 'text/html', html(`<form method="post" action="/login">
      <input name="username" aria-label="Username"><input name="password" type="password" aria-label="Password">
      <button>Sign in</button></form>`));
  }
  if (route === 'POST /login') {
    const f = new URLSearchParams(await readBody(req));
    await sleep(LOGIN_DELAY);
    const u = f.get('username'), p = f.get('password');
    if (!check(u, p)) { stats.badLogins++; saveStats(); return send(401, 'text/plain', 'bad credentials'); }
    stats.formLogins[u]++; saveStats();
    const sid = randomBytes(16).toString('hex');
    sessions.set(sid, { user: u, exp: Date.now() + SESSION_TTL });
    return send(200, 'text/html', html(`<h1>Welcome ${u}</h1>`), {
      'set-cookie': `session=${sid}; Path=/; HttpOnly; Max-Age=${Math.floor(SESSION_TTL / 1000)}`,
    });
  }
  if (route === 'POST /api/token') {
    const { username: u, password: p } = JSON.parse((await readBody(req)) || '{}');
    await sleep(LOGIN_DELAY);
    if (!check(u, p)) return send(401, 'application/json', '{"error":"bad credentials"}');
    stats.tokenLogins[u]++; saveStats();
    const token = randomBytes(16).toString('hex');
    tokens.set(token, { user: u, exp: Date.now() + TOKEN_TTL });
    return send(200, 'application/json', JSON.stringify({ access_token: token, expires_in: TOKEN_TTL / 1000 }));
  }
  if (route === 'GET /me') {
    const u = userFromCookie(req);
    if (!u) { stats.rejected401++; saveStats(); return send(401, 'text/html', html('<h1>Please sign in</h1>')); }
    return send(200, 'text/html', html(`<h1>Hello ${u}</h1>`));
  }
  if (route === 'GET /admin') {
    const u = userFromCookie(req);
    if (!u) return send(401, 'text/html', html('<h1>Please sign in</h1>'));
    if (u !== 'admin') return send(403, 'text/html', html('<h1>Forbidden</h1>'));
    return send(200, 'text/html', html('<h1>Admin area</h1>'));
  }
  if (route === 'GET /api/me') {
    const u = userFromBearer(req);
    if (!u) { stats.rejected401++; saveStats(); return send(401, 'application/json', '{"error":"unauthorized"}'); }
    return send(200, 'application/json', JSON.stringify({ user: u }));
  }
  return send(404, 'text/plain', 'not found');
}).listen(PORT, () => console.log(`s4 app on http://localhost:${PORT}`));
