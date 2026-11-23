// Compile-only checks. `tsc` passing means every @ts-expect-error line really is an error.
import { coreSchema, defineConfig, loadConfig, z, type ConfigOf } from '../src/config/index.js';

// ---- Extended schema, as a user project would write it ----
export const schema = coreSchema.extend({
  app: z.strictObject({
    tenant: z.string(),
    features: z.array(z.enum(['search', 'checkout'])).default([]),
  }),
});

export const def = defineConfig({
  schema,
  base: { baseURL: 'http://localhost:3000', app: { tenant: 'acme' } },
  profiles: {
    local: {},
    staging: { baseURL: 'https://staging.example.test', app: { features: ['search'] } },
  },
});

// Hover / declaration-emit probe: these lines' emitted .d.ts show what users see.
export const cfg = loadConfig(def);
export const coreOnly = loadConfig(defineConfig({ base: { baseURL: 'http://x.test' }, profiles: { local: {} } }));
export type AppConfig = ConfigOf<typeof schema>;
// Recommended pattern: annotate with the named alias, so hovers show just "AppConfig".
export const annotated: AppConfig = loadConfig(def);

// ---- Positive inference ----
const tenant: string = cfg.app.tenant;
const features: readonly ('search' | 'checkout')[] = cfg.app.features;
const action: number = cfg.timeouts.action;
const profile: string = cfg.profile;
void [tenant, features, action, profile];

// ---- Result is deeply readonly ----
// @ts-expect-error top-level readonly
cfg.baseURL = 'x';
// @ts-expect-error nested readonly
cfg.app.tenant = 'x';
// @ts-expect-error readonly array
cfg.app.features.push('search');

// ---- Overlays are checked against the schema ----
defineConfig({
  schema,
  base: { baseURL: 'http://x.test', app: { tenant: 'a' } },
  profiles: {
    // @ts-expect-error wrong type in a profile
    a: { timeouts: { action: '5s' } },
    // @ts-expect-error enum member that does not exist
    b: { app: { features: ['refunds'] } },
    // @ts-expect-error typo in a nested key
    c: { app: { tennant: 'x' } },
  },
});

// ---- Overrides are typed too ----
// @ts-expect-error override of an unknown key
loadConfig(def, { overrides: { nope: true } });

// ---- Schemas must keep the core contract (other modules read baseURL/production) ----
// @ts-expect-error schema without baseURL is not a ConfigSchema
defineConfig({ schema: coreSchema.omit({ baseURL: true }), profiles: { local: {} } });

// ---- Known limitation probe: base may be incomplete (profiles fill it), so a missing
// required key is only caught at load time, not by the compiler. This must compile: ----
defineConfig({ schema, base: {}, profiles: { local: {} } });
