// Prototype of @qa-cortex/core/sessions.
// One role definition serves the browser (storageState) AND the API (headers).
// The store only hands out plain option objects; users call raw Playwright with them.
import { mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { APIRequestContext } from '@playwright/test';

export type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

export interface RoleSession {
  readonly storageState: StorageState;
  /** Sent with API calls (e.g. Authorization). Never put into the browser context by default. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Epoch ms when the earliest credential (cookie or token) expires. Omit for "never". */
  readonly expiresAt?: number;
}

export interface LoginContext {
  /** Untraced request context created by the store. Cookies it collects are captured by storageState(). */
  readonly request: APIRequestContext;
  readonly role: string;
}

export interface RoleDefinition {
  readonly name: string;
  login(ctx: LoginContext): Promise<RoleSession>;
  /**
   * Optional cheap check of a session read from DISK (e.g. GET /api/me).
   * Catches server-side invalidation (restart, deploy, logout, revocation) that expiry can't see.
   * `request` already carries the session's cookies and headers.
   */
  validate?(ctx: LoginContext): Promise<boolean>;
}

export const defineRole = (role: RoleDefinition): RoleDefinition => role;

export interface SessionStoreOptions {
  /** Where session files live, e.g. `.auth/<profile>`. Keep it OUT of Playwright's outputDir (ADR 0003). */
  readonly dir: string;
  readonly roles: readonly RoleDefinition[];
  /**
   * Factory for the login/validate request context, e.g.
   * (opts) => playwright.request.newContext({ baseURL, ...opts }).
   */
  readonly newRequestContext: (
    options?: { storageState?: string; extraHTTPHeaders?: Record<string, string> },
  ) => Promise<APIRequestContext>;
  /** Re-login this long before expiry. Default 60s. */
  readonly refreshSkewMs?: number;
  /** Cross-process lock around login. Default true. (Spike toggle to demonstrate races.) */
  readonly lock?: boolean;
  readonly lockTimeoutMs?: number;
  readonly staleLockMs?: number;
  readonly now?: () => number;
}

interface SessionMeta {
  readonly role: string;
  readonly createdAt: number;
  readonly expiresAt?: number;
  readonly headers: Readonly<Record<string, string>>;
}

export interface SessionHandle {
  readonly role: string;
  /** When this session was created (identifies one login). */
  readonly createdAt: number;
  /** Absolute-or-relative path usable as `storageState` in config, test.use() or newContext(). */
  readonly storageStatePath: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: number | undefined;
  /** Options for browser.newContext() / test.use(). */
  browserContextOptions(): { storageState: string };
  /** Options for playwright.request.newContext(): cookies AND headers. */
  requestContextOptions(): { storageState: string; extraHTTPHeaders: Record<string, string> };
}

export class SessionStore {
  readonly #o: Required<Omit<SessionStoreOptions, 'roles'>> & { roles: Map<string, RoleDefinition> };
  readonly #memo = new Map<string, SessionHandle>();
  readonly #inflight = new Map<string, Promise<SessionHandle>>();

  constructor(options: SessionStoreOptions) {
    this.#o = {
      refreshSkewMs: 60_000,
      lock: true,
      lockTimeoutMs: 30_000,
      staleLockMs: 60_000,
      now: Date.now,
      ...options,
      roles: new Map(options.roles.map((r) => [r.name, r])),
    };
  }

  paths(role: string): { state: string; meta: string; lock: string } {
    if (!/^[\w.-]+$/.test(role)) throw new Error(`invalid role name "${role}"`);
    const base = join(this.#o.dir, role);
    return { state: `${base}.json`, meta: `${base}.meta.json`, lock: `${base}.lock` };
  }

  /** Return a fresh session for `role`, logging in only if none is cached or it is about to expire. */
  ensure(role: string): Promise<SessionHandle> {
    const memo = this.#memo.get(role);
    if (memo && this.#fresh(memo.expiresAt)) return Promise.resolve(memo);
    // Collapse concurrent calls within one process into one.
    let p = this.#inflight.get(role);
    if (!p) {
      p = this.#ensureSlow(role).finally(() => this.#inflight.delete(role));
      this.#inflight.set(role, p);
    }
    return p;
  }

  async #ensureSlow(role: string): Promise<SessionHandle> {
    const def = this.#o.roles.get(role);
    if (!def) throw new Error(`unknown role "${role}". Known roles: ${[...this.#o.roles.keys()].join(', ')}`);
    const paths = this.paths(role);

    const cached = await this.#readFresh(role);
    if (cached && (await this.#valid(def, cached))) return this.#remember(cached);

    await mkdir(this.#o.dir, { recursive: true });
    const release = this.#o.lock ? await this.#acquire(paths.lock) : async () => {};
    try {
      // Double-check: another worker may have logged in while we waited for the lock.
      // A file we already found invalid (same createdAt) is not re-checked.
      const again = await this.#readFresh(role);
      if (again && again.createdAt !== cached?.createdAt && (await this.#valid(def, again))) {
        return this.#remember(again);
      }

      const request = await this.#o.newRequestContext();
      let session: RoleSession;
      try {
        session = await def.login({ request, role });
      } finally {
        await request.dispose();
      }
      const meta: SessionMeta = {
        role,
        createdAt: this.#o.now(),
        headers: { ...session.headers },
        ...(session.expiresAt !== undefined ? { expiresAt: session.expiresAt } : {}),
      };
      // State first, meta last: meta is the "commit marker" readers check.
      await atomicWrite(paths.state, JSON.stringify(session.storageState));
      await atomicWrite(paths.meta, JSON.stringify(meta));
      return this.#remember(this.#handle(meta));
    } finally {
      await release();
    }
  }

  async #valid(def: RoleDefinition, h: SessionHandle): Promise<boolean> {
    if (!def.validate) return true;
    const request = await this.#o.newRequestContext(h.requestContextOptions());
    try {
      return await def.validate({ request, role: h.role });
    } catch {
      return false;
    } finally {
      await request.dispose();
    }
  }

  #fresh(expiresAt: number | undefined): boolean {
    return expiresAt === undefined || expiresAt - this.#o.refreshSkewMs > this.#o.now();
  }

  async #readFresh(role: string): Promise<SessionHandle | undefined> {
    try {
      const meta = JSON.parse(await readFile(this.paths(role).meta, 'utf8')) as SessionMeta;
      return this.#fresh(meta.expiresAt) ? this.#handle(meta) : undefined;
    } catch {
      return undefined;
    }
  }

  #remember(h: SessionHandle): SessionHandle {
    this.#memo.set(h.role, h);
    return h;
  }

  #handle(meta: SessionMeta): SessionHandle {
    const storageStatePath = this.paths(meta.role).state;
    const headers = Object.freeze({ ...meta.headers });
    return Object.freeze({
      role: meta.role,
      createdAt: meta.createdAt,
      storageStatePath,
      headers,
      expiresAt: meta.expiresAt,
      browserContextOptions: () => ({ storageState: storageStatePath }),
      requestContextOptions: () => ({ storageState: storageStatePath, extraHTTPHeaders: { ...headers } }),
    });
  }

  /** O_EXCL lock file; stale locks (crashed worker) are broken after staleLockMs. */
  async #acquire(lockPath: string): Promise<() => Promise<void>> {
    const deadline = this.#o.now() + this.#o.lockTimeoutMs;
    for (;;) {
      try {
        const fh = await open(lockPath, 'wx');
        await fh.writeFile(`${process.pid}`);
        await fh.close();
        return () => rm(lockPath, { force: true });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
        const age = await stat(lockPath).then((s) => this.#o.now() - s.mtimeMs, () => 0);
        if (age > this.#o.staleLockMs) await rm(lockPath, { force: true });
        else if (this.#o.now() > deadline) throw new Error(`timed out waiting for session lock ${lockPath}`);
        else await new Promise((r) => setTimeout(r, 50 + Math.random() * 50));
      }
    }
  }
}

async function atomicWrite(path: string, data: string): Promise<void> {
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(tmp, data, { mode: 0o600 });
  // Windows: rename can fail transiently (EPERM/EBUSY) if another process (AV, indexer, a
  // concurrent writer) has the target open. The lock prevents concurrent writers; retry the rest.
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(tmp, path);
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if ((code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') || attempt >= 10) {
        await rm(tmp, { force: true });
        throw e;
      }
      await new Promise((r) => setTimeout(r, 20 * (attempt + 1)));
    }
  }
}
