# ADR 0004 — S4 sessions: one role definition, a file-backed store, logins in an untraced setup project

- Status: accepted (spike S4, 2026-11-23)
- Spike code: `spikes/s4-sessions/`
  - `src/sessions.ts`: the store prototype
  - `src/app-roles.ts`: what a user writes
  - `design-a/`, `design-b/`: the two designs
- Versions tested: Node 26.13.1, `@playwright/test` 1.65.1, Chromium, 4 workers, Windows 11

## Question
How should roles produce **both** a browser session (`storageState`) and API auth (headers or tokens), with:
- no login races between workers
- expiry handled
- passwords kept out of traces (ADR 0003)
- raw Playwright left untouched?

## Setup
- **Local app.**
  - Form login sets an HttpOnly session cookie.
  - `POST /api/token` returns a bearer token.
  - Both expire, with a configurable TTL.
  - Logins take 300 ms, to widen race windows.
  - The server counts logins and failed logins.
- **Roles.** `admin` and `viewer`, with random per-run passwords. The passwords double as canaries.
- **The same core is used by both designs:**

```ts
defineRole({
  name: 'admin',
  login({ request }) → { storageState, headers?, expiresAt? },  // user's own login flow
  validate?({ request }) → boolean,                             // optional cheap "still valid?" probe
});
new SessionStore({ dir: '.auth/<profile>', roles, newRequestContext, refreshSkewMs?, lock? })
store.ensure(role) → SessionHandle {
  storageStatePath, headers, expiresAt,
  browserContextOptions()  → { storageState }                    // for test.use / browser.newContext
  requestContextOptions()  → { storageState, extraHTTPHeaders }  // for playwright.request.newContext
}
```

The store **hands out plain option objects**; tests call `test.use`, `browser.newContext` and `playwright.request.newContext` themselves. Nothing is wrapped.

How the store works:
- **Files:** `<role>.json` holds the storageState, so Playwright can read it directly. `<role>.meta.json` holds headers and expiry, and is written last as the commit marker.
- **Atomic writes:** temporary file, then rename, with file mode `0o600`.
- **Lock:** an `O_EXCL` lock file shared by all processes, with stale-lock breaking. After getting the lock, the store re-checks whether another worker already logged in.
- **Within a process:** results are memoised, and concurrent `ensure` calls for the same role share one login.

**Design A.** A setup project (`trace: 'off'`) calls `ensure()` for every role once. E2E tests depend on it and only *read* sessions; their store refuses to log in.

**Design B.** No setup project. A worker-scoped `sessionStore` fixture, plus a `role` option that overrides Playwright's own `storageState` fixture, logs in lazily on first use. A `session(role)` fixture serves extra roles.

## Results
| Scenario | A (setup project) | B (lazy fixture) |
|---|---|---|
| cold run, 4 workers, 11 tests | ✅, 1 login per role | ✅, 1 login per role |
| B without the lock | — | 4 logins per role; on Windows also `EPERM` when renames collide |
| browser + API from one role (cookie and bearer) | ✅ | ✅ |
| two roles in one test (two contexts + API) | ✅ | ✅ |
| token/session expires mid-run (TTL 4 s) | ❌ cached header returns 401; tests can't refresh | ✅ re-login, 2 logins |
| cached files still "fresh" but server forgot them (restart) | ❌ 10/10 failed → ✅ with `validate()` | ❌ 10/10 failed → ✅ with `validate()` |
| wrong password for one role | **1** bad login attempt; 1 failure, the rest *did not run* | **5** bad login attempts (one per test needing the role) |
| passwords in any trace | 0 hits | 0 hits when login runs in a **fixture**; **hits when a refresh login runs in the test body** (6 entries: params, network, bodies) |

A cold login inside a test-scoped fixture was confirmed separately:
- The trace for that test recorded only the test's own `GET /admin`.
- Fixture-time API calls are not recorded.
- This is **observed behaviour in 1.65.1, not documented**.

## Decision
Use one core with two integration points. Each point does only what it does safely.

1. **Core (`@qa-cortex/core/sessions`).** `defineRole` + `SessionStore` exactly as prototyped:
   - file-backed cache under `.auth/<profile>/`, outside `outputDir`, gitignored
   - cross-process lock with a re-check after locking, atomic writes, retry on Windows `EPERM`/`EBUSY`
   - optional `validate()` the first time a session is read from disk in each process
   - `refreshSkewMs` before `expiresAt`
   - plain option objects out
   - **no dependency on the config module.** The profile is just the `dir` argument. Module 2 supplies credentials to the user's `login()`.
2. **Primary path: setup project, `trace: 'off'`** (design A). It makes all logins happen before any test, which gives us:
   - documented, explicit "no password in traces"
   - one failed login attempt per bad credential, so no lockouts
   - one clear failure instead of N
   - session reuse across local runs (validated)
3. **Test-side fixtures** (design B ergonomics), layered on top:
   - a `role` option that overrides `storageState`
   - a `session(role)` accessor
   - **refresh only inside fixtures, between tests,** never in the test body. Module 3 enforces this:
     - The in-body accessor is read-only and throws if a login would be needed.
     - Extra roles are declared up front (`test.use({ roles: ['admin', 'viewer'] })`), so a fixture resolves them before the body runs.
   - **A failed login is recorded across processes** (a marker file with a cooldown), so a bad credential is tried once per run, not once per worker.
4. **Regression test in module 3's suite:** run the fixture refresh path with `trace: 'on'` and scan the traces for the password. If a Playwright upgrade starts tracing fixture-time requests, CI fails, and we fall back to setup-only refresh.
5. **Docs:**
   - Session files and later traces still carry *session tokens* (ADR 0003). That's acceptable for non-production; production runs keep traces off (module 2).
   - On Windows `0o600` has no effect, so `.auth/` must stay out of shared or synced folders.

## Not measured
- **Saved logins on warm runs with a long-lived server.** The spike server restarts with every run, so every warm run had to log in again. With a persistent server, validated reuse should make 0 logins.
- **Firefox and WebKit.** Not tested.
- **Many-worker contention beyond 4 workers.** Not tested.
- **Lock behaviour on network filesystems.** Not tested.
- **Token expiring in the middle of a single long test.** Not handled. It fails with 401, by design.
