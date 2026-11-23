// Compile-only type tests for configFixtures() (TypeScript 6.0.3, `npm run typecheck`).
// One invalid case per statement (ADR 0005). Not executed.
import { test as base, defineConfig, mergeTests } from '@playwright/test';
import {
  configFixtures,
  coreSchema,
  defineQaConfig,
  z,
  type ConfigOf,
  type ConfigWorkerFixtures,
} from '@qa-cortex/core/config';

const schema = coreSchema.extend({ app: z.strictObject({ tenant: z.string() }) });
const def = defineQaConfig({ schema, base: { baseURL: 'http://x.test', app: { tenant: 'a' } }, profiles: { local: {} } });

// ---------------------------------------------------------------- recommended: explicit worker type
const test = base.extend<object, ConfigWorkerFixtures<typeof schema>>(configFixtures(def));

test('fixtures are typed from the schema', ({ qaConfig, qaProfile, page }) => {
  const tenant: string = qaConfig.app.tenant;
  const config: ConfigOf<typeof schema> = qaConfig;
  const profile: string | undefined = qaProfile;
  void [tenant, config, profile, page]; // Playwright's own fixtures are still there
  // @ts-expect-error not in the schema
  void qaConfig.nope;
});

test('qaConfig is deeply readonly', ({ qaConfig }) => {
  // @ts-expect-error readonly
  qaConfig.app.tenant = 'x';
});

// ---------------------------------------------------------------- inference without the generic
const inferred = base.extend(configFixtures(def));
inferred('inference also works without the explicit generic', ({ qaConfig }) => {
  const tenant: string = qaConfig.app.tenant;
  void tenant;
});

// ---------------------------------------------------------------- options: test.use and project use
test.use({ qaProfile: 'staging' });
// @ts-expect-error qaProfile is a string
test.use({ qaProfile: 42 });

defineConfig<object, ConfigWorkerFixtures<typeof schema>>({ projects: [{ name: 'staging', use: { qaProfile: 'staging' } }] });
// @ts-expect-error qaProfile is a string
defineConfig<object, ConfigWorkerFixtures<typeof schema>>({ projects: [{ name: 'x', use: { qaProfile: true } }] });

// ---------------------------------------------------------------- composition
const extended = test.extend<{ greeting: string }>({
  greeting: async ({ qaConfig }, use) => {
    await use(qaConfig.app.tenant);
  },
});
const merged = mergeTests(extended, base.extend<{ answer: number }>({ answer: [42, { option: true }] }));
merged('merged fixtures keep their types', ({ qaConfig, greeting, answer }) => {
  const values: [string, string, number] = [qaConfig.app.tenant, greeting, answer];
  void values;
});

// ---------------------------------------------------------------- misuse
const otherSchema = coreSchema.extend({ other: z.number() });
// @ts-expect-error fixtures built from one schema cannot be declared as another schema's
base.extend<object, ConfigWorkerFixtures<typeof otherSchema>>(configFixtures(def));

// @ts-expect-error configFixtures takes a config definition, not a schema
configFixtures(schema);

export { otherSchema };
