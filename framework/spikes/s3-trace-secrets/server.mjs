// Tiny app under test. Knows only the canaries a real server would hold
// (a session cookie it issues, data it renders, a token it returns).
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const c = JSON.parse(readFileSync(new URL('./out/canaries.json', import.meta.url), 'utf8'));
const PORT = Number(process.env.PORT ?? 4173);

const html = (body) => `<!doctype html><html><head><title>S3 app</title></head><body>${body}</body></html>`;

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const send = (status, type, body, headers = {}) => {
    res.writeHead(status, { 'content-type': type, ...headers });
    res.end(body);
  };
  // Drain bodies so POSTs complete; we never echo request data back.
  req.resume();

  switch (`${req.method} ${url.pathname}`) {
    case 'GET /login':
      return send(200, 'text/html', html(`
        <form method="post" action="/login">
          <label>Username <input id="username" name="username"></label>
          <label>Password <input id="password" name="password" type="password"></label>
          <label>Token <input id="token" name="token"></label>
          <button type="submit">Sign in</button>
        </form>
        <div data-token="other">x</div>`));
    case 'POST /login':
      return send(200, 'text/html', html('<h1>Welcome</h1>'), {
        'set-cookie': `session=${c.serverCookie}; Path=/; HttpOnly`,
      });
    case 'GET /profile':
      return send(200, 'text/html', html(`<h1>Profile</h1><p>Your API key: <code id="key">${c.serverRendered}</code></p>`));
    case 'GET /api/token':
      return send(200, 'application/json', JSON.stringify({ access_token: c.responseBody }));
    case 'GET /api/echo':
    case 'POST /api/data':
      return send(200, 'application/json', '{"ok":true}');
    case 'GET /basic': {
      if (!req.headers.authorization) {
        return send(401, 'text/plain', 'auth required', { 'www-authenticate': 'Basic realm="s3"' });
      }
      return send(200, 'text/html', html('<h1>basic ok</h1>'));
    }
    default:
      return send(404, 'text/plain', 'not found');
  }
}).listen(PORT, () => console.log(`s3 app on http://localhost:${PORT}`));
