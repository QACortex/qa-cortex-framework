// Spike knobs shared by both designs (read from env so one config serves every variant).
export const VARIANT = process.env.S4_VARIANT ?? 'default';
export const OUT = `out/${VARIANT}`;
/** Session files: outside outputDir on purpose (ADR 0003). One dir per profile. */
export const AUTH_DIR = process.env.S4_AUTH_DIR ?? `.auth/${VARIANT}`;
export const SKEW_MS = Number(process.env.S4_SKEW_MS ?? 60_000);
export const TTL_MS = process.env.S4_TTL_MS;
export const EXPIRY_TEST = !!process.env.S4_EXPIRY;

export const webServer = {
  command: 'node server.mjs',
  url: 'http://localhost:4174/login',
  reuseExistingServer: false,
  env: {
    STATS_FILE: `${OUT}/stats.json`,
    ...(TTL_MS ? { SESSION_TTL_MS: TTL_MS, TOKEN_TTL_MS: TTL_MS } : {}),
  },
};
