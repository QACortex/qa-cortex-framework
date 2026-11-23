// What a USER project would write: its own roles and login flow. Not library code.
import { readFileSync } from 'node:fs';
import { defineRole, type RoleDefinition } from './sessions.js';

export const BASE_URL = 'http://localhost:4174';

// In the real framework, credentials come from the secrets loader (module 2).
const creds = JSON.parse(readFileSync('out/creds.json', 'utf8')) as Record<string, { username: string; password: string }>;

function appRole(name: string): RoleDefinition {
  return defineRole({
    name,
    async login({ request }) {
      const real = creds[name];
      if (!real) throw new Error(`no credentials for ${name}`);
      // Spike knob: S4_BAD_PW=<role> sends a wrong password for that role.
      const c = process.env.S4_BAD_PW === name ? { ...real, password: 'wrong' } : real;
      // Browser session: form login sets the HttpOnly session cookie on this request context.
      const form = await request.post('/login', { form: c });
      if (!form.ok()) throw new Error(`form login failed for ${name}: ${form.status()}`);
      // API session: bearer token.
      const tok = await request.post('/api/token', { data: c });
      if (!tok.ok()) throw new Error(`token login failed for ${name}: ${tok.status()}`);
      const { access_token, expires_in } = (await tok.json()) as { access_token: string; expires_in: number };

      const storageState = await request.storageState();
      const cookieExp = Math.min(...storageState.cookies.map((k) => (k.expires > 0 ? k.expires * 1000 : Infinity)));
      return {
        storageState,
        headers: { Authorization: `Bearer ${access_token}` },
        expiresAt: Math.min(cookieExp, Date.now() + expires_in * 1000),
      };
    },
    // Both halves must still be accepted by the server.
    async validate({ request }) {
      const [api, web] = await Promise.all([request.get('/api/me'), request.get('/me')]);
      return api.ok() && web.ok();
    },
  });
}

export const roles = [appRole('admin'), appRole('viewer')];
