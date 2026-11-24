import { expect, test } from '@playwright/test';
import { isPlainObject, MergeError, mergeLayers, sourceOf } from '../src/config/merge.js';

const merge = (...values: unknown[]) =>
  mergeLayers(values.map((value, i) => ({ name: `L${i}`, value })));

test.describe('merge rules', () => {
  test('plain objects merge deeply', () => {
    const { value } = merge({ a: { x: 1, y: 2 } }, { a: { y: 3, z: 4 } });
    expect(value).toEqual({ a: { x: 1, y: 3, z: 4 } });
  });

  test('arrays replace, never concat', () => {
    expect(merge({ tags: ['a', 'b'] }, { tags: ['c'] }).value).toEqual({ tags: ['c'] });
    expect(merge({ tags: ['a'] }, { tags: [] }).value).toEqual({ tags: [] });
  });

  test('undefined is ignored, null replaces', () => {
    expect(merge({ a: 1, b: 2 }, { a: undefined, b: null }).value).toEqual({ a: 1, b: null });
  });

  test('non-plain values are taken by reference', () => {
    class Custom { n = 1; }
    const date = new Date(0), url = new URL('https://x.test'), re = /x/, map = new Map(), fn = () => 1;
    const custom = new Custom();
    const { value } = merge({ date: new Date(1), custom: { n: 2 } }, { date, url, re, map, fn, custom });
    expect(value.date).toBe(date);
    expect(value.url).toBe(url);
    expect(value.re).toBe(re);
    expect(value.map).toBe(map);
    expect(value.fn).toBe(fn);
    expect(value.custom).toBe(custom); // class instance over a plain object: replaced, not merged
  });

  test('object over primitive and primitive over object both replace', () => {
    expect(merge({ a: 1 }, { a: { b: 2 } }).value).toEqual({ a: { b: 2 } });
    expect(merge({ a: { b: 2 } }, { a: 1 }).value).toEqual({ a: 1 });
  });

  test('inputs are never mutated (frozen inputs are fine)', () => {
    const base = Object.freeze({ a: Object.freeze({ x: 1 }), list: Object.freeze([1]) });
    const over = Object.freeze({ a: Object.freeze({ y: 2 }) });
    const { value } = merge(base, over);
    expect(base).toEqual({ a: { x: 1 }, list: [1] });
    expect(value.a).not.toBe(base.a);
    expect(value.a).toEqual({ x: 1, y: 2 });
  });

  test('null-prototype objects count as plain', () => {
    const o = Object.assign(Object.create(null) as Record<string, unknown>, { x: 1 });
    expect(isPlainObject(o)).toBe(true);
    expect(merge({ a: { y: 2 } }, { a: o }).value).toEqual({ a: { x: 1, y: 2 } });
  });

  test('prototype pollution keys are rejected', () => {
    const evil = JSON.parse('{"nested":{"__proto__":{"polluted":true}}}') as unknown;
    expect(() => merge({}, evil)).toThrow(MergeError);
    expect(() => merge({}, { constructor: { prototype: {} } })).toThrow(/forbidden key "constructor"/);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  test('a layer must be a plain object', () => {
    expect(() => merge([1, 2])).toThrow(/L0 must be a plain object/);
    expect(() => merge(new (class X {})())).toThrow(MergeError);
  });
});

test.describe('provenance', () => {
  test('records the last layer per leaf', () => {
    const { provenance } = merge({ a: { x: 1, y: 2 }, tags: ['a'] }, { a: { y: 3 } });
    expect(sourceOf(provenance, ['a', 'x'])).toBe('L0');
    expect(sourceOf(provenance, ['a', 'y'])).toBe('L1');
    expect(sourceOf(provenance, ['tags', 0])).toBe('L0'); // array items resolve to the array
  });

  test('replacing a subtree drops its old provenance', () => {
    const { provenance } = merge({ a: { x: 1 } }, { a: 5 });
    expect(provenance.has('a.x')).toBe(false);
    expect(sourceOf(provenance, ['a'])).toBe('L1');
  });

  test('untouched paths have no source', () => {
    expect(sourceOf(merge({ a: 1 }).provenance, ['b'])).toBeUndefined();
  });
});
