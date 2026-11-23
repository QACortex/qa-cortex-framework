import { roles } from '../src/app-roles.js';
import { SessionStore, type SessionStoreOptions } from '../src/sessions.js';
import { AUTH_DIR, SKEW_MS } from '../src/run-env.js';

/** Store for the setup project: allowed to log in. */
export const setupStore = (newRequestContext: SessionStoreOptions['newRequestContext']) =>
  new SessionStore({ dir: AUTH_DIR, roles, refreshSkewMs: SKEW_MS, newRequestContext });

/**
 * Store for tests: read-only. In design A a test must never log in itself.
 * No validate() here: auth-setup validated (or re-logged-in) moments ago.
 */
export const readStore = new SessionStore({
  dir: AUTH_DIR,
  roles: roles.map(({ validate: _skip, ...role }) => role),
  refreshSkewMs: SKEW_MS,
  newRequestContext: () => {
    throw new Error('design A: session missing or expired and tests may not log in (re-run auth-setup)');
  },
});
