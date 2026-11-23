# ADR 0002 — S2 config merge: layers, Zod 4 validation, frozen typed result

- Status: accepted (spike S2, 2026-11-23). Amended by the addendum at the end (production implementation and API review), which supersedes the API names and core schema fields listed under "Locked API".
- Spike code: `spikes/s2-config-merge/` (prototype of `@qa-cortex/core/config`; module 1 starts from it)
- Versions tested: Node 26.13.1, TypeScript 7.0.2, Zod 4.6.7, `@playwright/test` 1.65.1
- Evidence:
  - 28 unit tests (`test/merge.spec.ts`, `test/load.spec.ts`)
  - compile-only type tests (`types/type-tests.ts`)
  - a Playwright run with 2 projects × 3 workers (`e2e/`)

## Question
How should config layers merge, validate and reach tests, so that:
- types stay readable
- errors say where a bad value came from
- the config is safe to use from `playwright.config.ts` and from workers?

## Locked API (module 1)
```ts
// @qa-cortex/core/config
export { z } from 'zod';                    // users extend with THIS z, not their own
export const coreSchema;                    // strict: baseURL, production, timeouts, api?, ai?
export function defineConfig(def): ConfigDefinition<S>;      // schema optional → coreSchema
export function loadConfig(def, { profile?, overrides?, env? }?): LoadedConfig<z.output<S>>;
export class ConfigError extends Error { profile; issues: { path, message, source }[] }
export function configOption<C>();          // worker option fixture `qaConfig` (recommended)
export function configFixtures<C>(cfg);     // worker fixture holding a loaded config
export type LoadedConfig<T>, ConfigOf<S>, ConfigOverlay<S>, ConfigSchema, DeepPartial, DeepReadonly;
export const PROFILE_ENV_VAR = 'QA_PROFILE', DEFAULT_PROFILE = 'local';
```

User side:
```ts
export const schema = coreSchema.extend({ app: z.strictObject({ tenant: z.string() }) });
export type AppConfig = ConfigOf<typeof schema>;        // annotate with this for short hovers
export const qaConfig = defineConfig({ schema, base: {...}, profiles: { local: {}, staging: {...} } });
// playwright.config.ts
const cfg = loadConfig(qaConfig);                       // validates in main process, fails fast
export default defineConfig<{}, { qaConfig: AppConfig }>({ use: { baseURL: cfg.baseURL, qaConfig: cfg } });
```

## Decisions

### Layering
- **Order, lowest to highest:** schema defaults → `base` → `profiles[name]` → `overrides`.
- **Choosing the profile:** `options.profile`, then `QA_PROFILE` (trimmed; blank is ignored), then `defaultProfile`, then `"local"`.
- **An unknown profile is an error.** The error lists the known profiles and says where the name came from (`env QA_PROFILE`, options, default). Inherited keys such as `toString` are never treated as profiles.
- **Every profile must be declared,** even an empty one (`local: {}`). That way a typo in `QA_PROFILE` can't silently fall back to the base config.

### Merge rules
These are tested in `merge.spec.ts`, and they become module 1's test list.

| Case | Rule |
|---|---|
| plain object over plain object | deep merge, key by key |
| array over anything | **replace** (never concat) |
| `undefined` | ignored: never deletes a lower layer's value |
| `null` | a real value; replaces |
| Date, URL, RegExp, Map, functions, class instances | taken **by reference**, never merged, never frozen |
| object over primitive, or primitive over object | replace |
| `Object.create(null)` objects | treated as plain objects |
| `__proto__`, `constructor`, `prototype` keys | **rejected** with `ConfigError` (prototype pollution from JSON) |
| a layer that isn't a plain object | rejected |
| inputs | never mutated; frozen inputs are fine |

The merge is our own code, about 60 lines, with no dependency. It records which layer set each leaf path, and that record is used in error messages.

### Validation
- **Merge first, then validate once** with `schema.safeParse`. Every issue is reported in a single `ConfigError`.
- **`coreSchema` and every nested object are `z.strictObject`,** so typos at any depth are errors. Plain `z.object` silently strips unknown keys, so docs and lint will steer user extensions to `z.strictObject`.
- **Use `.prefault({})` for nested objects that have defaults.** In Zod 4, `.default({})` skips the inner defaults.
- **Each issue carries `path`, `message` and `source`.** `source` is the layer that set the value, or `not set in base, profile "x"`. Real output:
  ```
  Invalid QA Cortex config (profile "staging"):
    - baseURL: Invalid input: expected string, received undefined [not set in base, profile "staging"]
    - timeouts.action: Too small: expected number to be >0 [profile "staging"]
    - baseURl: unknown key (typo, or missing from your schema extension?) [base]
  ```
- **Error messages never include values.** Config can hold secrets, and these messages land in CI logs. A test checks this.
- **Loading is synchronous.** It must work at the top of `playwright.config.ts` without top-level await (ADR 0001). Async refinements therefore throw loudly, and a test checks this.

### Reserved namespaces
- `api` and `ai` are `z.unknown().optional()` placeholders. Core keeps whatever is in them and never validates it.
- Phase 2/3 packages swap in a real schema with `coreSchema.extend({ api: apiSchema })`. A test shows the extended key then validates with provenance (`api.retries`).
- Core never imports API or AI code.

### Result
- The result is deep-frozen, but only plain objects and arrays. Class instances stay unfrozen because they may be shared with user code.
- It includes `profile`. The input definition is left untouched.

### Types
- Overlays are typed as `DeepPartial<z.input<S>>`; arrays stay whole because they replace. The type tests show the compiler catches:
  - wrong types in a profile
  - a bad enum member
  - nested and root key typos
  - unknown override keys
  - a schema that drops a core key (`ConfigSchema` requires output compatible with `CoreConfig`, so modules 2–6 can rely on `baseURL` and `production`)
- The result is typed as `LoadedConfig<z.output<S>>`, which is deeply readonly.
- **Hover readability:** the first prototype was parameterised by the *schema type*, so hovers showed `ZodPrefault<ZodObject<…, $strict>>` noise. Parameterising by the *output type* makes hovers show plain fields (`baseURL: string; timeouts: {…}`). We'll document the `type AppConfig = ConfigOf<typeof schema>` alias.
- **Known limit:** `base` may be incomplete, because profiles can fill it in. A required key missing from every layer is therefore caught at load time, not compile time.

### Playwright integration (measured)
- **The config is evaluated in every process.** `playwright.config.ts` and spec modules run in the main process *and* in each worker; we saw 1 + 6 workers for 2 projects × 3 workers. So `loadConfig` runs once per process. That's fine:
  - about 3.5 µs per call
  - pure and deterministic, so every process gets an equal result (tested)
  - Rule for module 1 docs: config files must not depend on time, randomness or the network.
- **Fails fast.** A bad `QA_PROFILE` exits 1 in the main process before any worker starts. Only one process evaluated the config.
- **`use` values reach workers live, not serialised.** The config arrived frozen, because each worker re-evaluates the config file. That makes the option-fixture pattern (`configOption()` + `use: { qaConfig }`) work, including a different profile per Playwright project. It's the recommended hand-off.
- **Importing a module-level config straight into tests also works.** No fixture is needed, so the fixture stays optional.

### Zod packaging
- Zod is a regular dependency of core and re-exported as `z`. Users must build extensions with that re-export. A second Zod copy (the user's own `zod` at another version) can break `.extend` typing. Document this, and consider a lint rule in `@qa-cortex/eslint-config`.

## Open items for module 1
- **Env var name.** `QA_PROFILE` is short but generic; `QA_CORTEX_PROFILE` is unambiguous. Decide before release.
- **`profile` key.** It's added to the result after validation. Module 1 should reserve it, so a user extension can't define a `profile` key.
- **Error printing.** Playwright prints `ConfigError`'s own enumerable fields after the message, which is noisy. Consider making `issues` non-enumerable, or overriding `[util.inspect.custom]`.
- **Ancestor provenance.** It's approximate. A default-filled leaf under an object a layer set (for example `timeouts.navigation` when only `timeouts.action` was set) is reported as coming from that layer. Acceptable for error messages.

## Addendum: production implementation and API review (2026-11-23)
This section records Step 4B (implementation in `packages/core/src/config/`, commit `6801925`) and the Step 4C API review. The merge rules, provenance, validation, error format and freeze rules above are unchanged.

### Final public API (`@qa-cortex/core/config`)
```ts
export { z } from 'zod';                    // users extend with THIS z
export const coreSchema;                    // strict: baseURL, production, api?, ai?
export function defineQaConfig(def): ConfigDefinition<S>;   // ONE signature; schema optional → coreSchema
export function loadConfig(def, { profile?, overrides?, env? }?): LoadedConfig<z.output<S>>;
export class ConfigError extends Error { profile; issues: { path, message, source }[] }  // non-enumerable
export const RESERVED_NAMESPACES /* ['api','ai'] */, isReservedNamespace;
export const PROFILE_ENV_VAR = 'QA_CORTEX_PROFILE', DEFAULT_PROFILE = 'local';
export type ConfigOf<S>, LoadedConfig<T>, ConfigDefinition<S>, ConfigDefinitionInput<S>, ConfigOverlay<S>,
  ConfigSchema, CoreSchema, CoreConfig, ConfigIssue, LoadOptions<S>, ReservedNamespace, DeepPartial, DeepReadonly;
```

### Changes from the "Locked API" above
| Spike S2 | Production | Why |
|---|---|---|
| `defineConfig` (two overloads) | **`defineQaConfig`**, one generic signature | Playwright also exports `defineConfig`, the import every user already has. A shared name forces aliasing and invites wrong auto-imports. One signature gives exact error positions on TypeScript 6 (ADR 0005). `loadConfig` keeps its name: Playwright has no `loadConfig`. |
| env var `QA_PROFILE` | **`QA_CORTEX_PROFILE`** | Unambiguous. Closes the open item. |
| `coreSchema.timeouts` (`action` 10 s, `navigation` 30 s) | **removed** | See "Timeouts" below. |
| `configOption()` / `configFixtures()` helpers | **not shipped** | A plain Playwright option fixture does the same job with no QA Cortex abstraction (shown by the nested Playwright integration test), and it drops the spike's `as never` cast. |
| `profile` result key unguarded | **reserved**: a schema that outputs `profile` gets a `ConfigError` | Closes the open item. |
| `ConfigError` fields printed twice by Playwright | `issues`/`profile` **non-enumerable** and frozen | Closes the open item. |

### Timeouts: why they're not in core
- **They duplicated Playwright.** `timeouts.action` and `timeouts.navigation` mirrored `use.actionTimeout` and `use.navigationTimeout` under other names, and nothing in QA Cortex read them.
- **They invited conflicting behaviour:**
  - **Not wired into `use`:** setting the value silently did nothing.
  - **Wired:** our defaults (10 s action) replaced Playwright's (action: 0, no limit) without the user choosing it.
  - **Both set:** two sources of truth.
- **The rule now:** core carries no Playwright settings. A project that wants a per-profile Playwright value extends the schema and maps it into `use` explicitly (README recipe).
- **The core contract** is `baseURL`, `production`, `api?`, `ai?`.
  - `baseURL` stays: it's the main per-profile value. It has no default and must be mapped into `use.baseURL` explicitly.
  - `production` is QA Cortex's own setting (read by the Production guard).
- **Compatibility:** nothing was published (`0.0.0`), so no deprecation alias or shim exists. A config that still sets `timeouts` now fails as an unknown key, which a test covers.

### Evidence
- **Runtime tests:** run against the built package through its public name. They cover:
  - merge rules
  - precedence (with nested defaults via a test-local extension)
  - profile selection
  - errors without secrets
  - immutability
  - reserved namespaces
  - `timeouts` rejection
  - a nested Playwright project (config flows from `playwright.config.ts` to workers; a bad profile fails fast)
- **Type tests:** compile-only, with one invalid case per `defineQaConfig` call. A typo reports TS2561 ("did you mean…") at the misspelled key.

### Still open
- Ancestor provenance remains approximate, as noted above.
