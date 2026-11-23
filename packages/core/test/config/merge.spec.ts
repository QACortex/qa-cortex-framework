// Merge rules (ADR 0002), exercised through the public API. The merge itself is internal,
// so every case goes through loadConfig() with a permissive `extra` section.
import { expect, test } from '@playwright/test';
import { ConfigError, coreSchema, defineConfig, loadConfig, z, type ConfigOverlay } from '@qa-cortex/core/config';

const schema = coreSchema.extend({ extra: z.unknown().optional() });
type Overlay = ConfigOverlay<typeof schema>;

/** Load with base/profile/overrides carrying only `extra` (baseURL supplied in base). */
function mergeExtra(base: unknown, profile?: unknown, overrides?: unknown): unknown {
  const def = defineConfig({
    schema,
    base: { baseURL: 'http://localhost:3000', extra: base },
    profiles: { local: profile === undefined ? {} : { extra: profile } },
  });
  const options = overrides === undefined ? { env: {} } : { env: {}, overrides: { extra: overrides } as Overlay };
  return loadConfig(def, options).extra;
}

test.describe('merge rules', () => {
  test('plain objects merge deeply across all three layers', () => {
    expect(mergeExtra({ a: { x: 1, y: 2 } }, { a: { y: 3, z: 4 } }, { a: { z: 5 }, b: true })).toEqual({
      a: { x: 1, y: 3, z: 5 },
      b: true,
    });
  });

  test('arrays replace and never concatenate, including with an empty array', () => {
    expect(mergeExtra({ tags: ['a', 'b'] }, { tags: ['c'] })).toEqual({ tags: ['c'] });
    expect(mergeExtra({ tags: ['a'] }, { tags: [] })).toEqual({ tags: [] });
  });

  test('undefined is ignored; null replaces', () => {
    expect(mergeExtra({ a: 1, b: 2 }, { a: undefined, b: null })).toEqual({ a: 1, b: null });
  });

  test('object over primitive and primitive over object both replace', () => {
    expect(mergeExtra({ a: 1 }, { a: { b: 2 } })).toEqual({ a: { b: 2 } });
    expect(mergeExtra({ a: { b: 2 } }, { a: 1 })).toEqual({ a: 1 });
  });

  test('non-plain values are taken by reference, never merged', () => {
    class Custom {
      n = 1;
    }
    const date = new Date(0);
    const url = new URL('https://example.test');
    const map = new Map<string, number>();
    const fn = (): number => 1;
    const custom = new Custom();
    const merged = mergeExtra({ date: new Date(1), custom: { n: 2 } }, { date, url, map, fn, custom }) as Record<string, unknown>;
    expect(merged.date).toBe(date);
    expect(merged.url).toBe(url);
    expect(merged.map).toBe(map);
    expect(merged.fn).toBe(fn);
    expect(merged.custom).toBe(custom); // class instance over a plain object: replaced
  });

  test('null-prototype objects count as plain and merge', () => {
    const bare = Object.assign(Object.create(null) as Record<string, unknown>, { x: 1 });
    expect(mergeExtra({ a: { y: 2 } }, { a: bare })).toEqual({ a: { x: 1, y: 2 } });
  });

  test('inputs are never mutated, and frozen inputs are accepted', () => {
    const base = Object.freeze({ a: Object.freeze({ x: 1 }), list: Object.freeze([1]) });
    const over = Object.freeze({ a: Object.freeze({ y: 2 }) });
    const merged = mergeExtra(base, over) as { a: unknown };
    expect(base).toEqual({ a: { x: 1 }, list: [1] });
    expect(merged.a).not.toBe(base.a);
    expect(merged.a).toEqual({ x: 1, y: 2 });
  });

  test('prototype-pollution keys are rejected as a ConfigError', () => {
    const evil = JSON.parse('{"nested":{"__proto__":{"polluted":true}}}') as unknown;
    expect(() => mergeExtra({}, evil)).toThrow(ConfigError);
    expect(() => mergeExtra({}, { constructor: { prototype: {} } })).toThrow(/forbidden key "extra.constructor"/);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  test('a layer that is not a plain object is rejected', () => {
    const def = defineConfig({ schema, base: [1, 2] as unknown as Overlay, profiles: { local: {} } });
    expect(() => loadConfig(def, { env: {} })).toThrow(/layer base must be a plain object/);
  });
});
