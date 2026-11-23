// Compile-only type tests for @qa-cortex/core/config, checked by `npm run typecheck`
// (TypeScript 6.0.3). Not executed. If tsc passes, every @ts-expect-error below really is
// an error and every positive assignment really type-checks.
//
// ADR 0005: TypeScript 6 reports several errors inside ONE call as a single error at the
// call, so each invalid case gets its own defineQaConfig() call.
import {
  coreSchema,
  defineQaConfig,
  loadConfig,
  z,
  type ConfigDefinition,
  type ConfigOf,
  type CoreSchema,
  type LoadedConfig,
} from '@qa-cortex/core/config';

// ---------------------------------------------------------------- shared fixtures
const schema = coreSchema.extend({
  app: z.strictObject({
    tenant: z.string(),
    features: z.array(z.enum(['search', 'checkout'])).default([]),
  }),
});
type AppConfig = ConfigOf<typeof schema>;

const appDef = defineQaConfig({
  schema,
  base: { baseURL: 'http://localhost:3000', app: { tenant: 'acme' } },
  profiles: { local: {}, staging: { baseURL: 'https://staging.example.test', app: { features: ['search'] } } },
});

// ---------------------------------------------------------------- inference: extended schema
const cfg = loadConfig(appDef);
const tenant: string = cfg.app.tenant;
const features: readonly ('search' | 'checkout')[] = cfg.app.features;
const baseURL: string = cfg.baseURL;
const production: boolean = cfg.production;
const profile: string = cfg.profile;
const reserved: unknown = cfg.api;
const annotated: AppConfig = loadConfig(appDef); // the named alias is assignable
const typedDef: ConfigDefinition<typeof schema> = appDef;

// ---------------------------------------------------------------- inference: schema omitted
const coreDef = defineQaConfig({ base: { baseURL: 'http://x.test' }, profiles: { local: {} } });
const coreTyped: ConfigDefinition<CoreSchema> = coreDef; // omitting `schema` means coreSchema
const coreCfg: LoadedConfig = loadConfig(coreDef);
// @ts-expect-error core config has no `app` section
void coreCfg.app;
// @ts-expect-error core config has no `timeouts` section (Playwright owns timeouts)
void coreCfg.timeouts;

// ---------------------------------------------------------------- the result is deeply readonly
// @ts-expect-error top-level property is readonly
cfg.baseURL = 'x';
// @ts-expect-error nested property is readonly
cfg.app.tenant = 'x';
// @ts-expect-error arrays are readonly
cfg.app.features.push('search');
// @ts-expect-error the profile name is readonly
cfg.profile = 'x';

// ---------------------------------------------------------------- one invalid case per call
defineQaConfig({
  schema,
  base: { baseURL: 'http://x.test', app: { tenant: 'a' } },
  // @ts-expect-error wrong type in a profile (number where a string is expected)
  profiles: { a: { app: { tenant: 42 } } },
});

defineQaConfig({
  schema,
  base: { baseURL: 'http://x.test', app: { tenant: 'a' } },
  // @ts-expect-error enum member that does not exist
  profiles: { b: { app: { features: ['refunds'] } } },
});

defineQaConfig({
  schema,
  base: { baseURL: 'http://x.test', app: { tenant: 'a' } },
  // @ts-expect-error typo in a nested key
  profiles: { c: { app: { tennant: 'x' } } },
});

defineQaConfig({
  // @ts-expect-error typo in a root key of the base layer
  base: { baseURl: 'http://x.test' },
  profiles: { local: {} },
});

defineQaConfig({
  base: { baseURL: 'http://x.test' },
  // @ts-expect-error profiles must be an object of overlays, not an array
  profiles: [{}],
});

// @ts-expect-error a schema without baseURL breaks the core contract other modules rely on
defineQaConfig({ schema: coreSchema.omit({ baseURL: true }), profiles: { local: {} } });

// @ts-expect-error a schema that is not an object schema at all
defineQaConfig({ schema: z.string(), profiles: { local: {} } });

// @ts-expect-error overrides are typed against the schema too
loadConfig(appDef, { overrides: { nope: true } });

// @ts-expect-error overrides respect value types
loadConfig(appDef, { overrides: { production: 'yes' } });

// ---------------------------------------------------------------- deliberate limitation (ADR 0002)
// `base` may be incomplete because profiles can fill it in, so a required key missing from
// every layer is caught by loadConfig() at run time, not by the compiler. This compiles:
defineQaConfig({ schema, base: {}, profiles: { local: {} } });

export { annotated, baseURL, coreTyped, features, production, profile, reserved, tenant, typedDef };
