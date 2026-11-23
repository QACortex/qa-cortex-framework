// Layered deep merge with provenance. No dependencies.
//
// Rules:
//   - plain objects (proto === Object.prototype or null) merge key by key
//   - arrays and every non-plain value (Date, URL, RegExp, Map, class instances, functions) REPLACE
//   - `undefined` is ignored (never deletes a lower layer's value)
//   - `null` is a real value and replaces
//   - inputs are never mutated; output contains fresh plain objects only
//   - `__proto__`, `constructor`, `prototype` keys are rejected (prototype pollution from JSON/env)

export interface Layer {
  /** Human-readable source, used in error messages: 'base', 'profile "staging"', 'overrides'. */
  readonly name: string;
  readonly value: unknown;
}

/** Leaf path (dot-joined) -> name of the layer that last set it. */
export type Provenance = ReadonlyMap<string, string>;

export interface MergeResult {
  readonly value: Record<string, unknown>;
  readonly provenance: Provenance;
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto: unknown = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

export class MergeError extends TypeError {
  override readonly name = 'MergeError';
}

export function mergeLayers(layers: readonly Layer[]): MergeResult {
  const provenance = new Map<string, string>();
  let acc: Record<string, unknown> = {};
  for (const layer of layers) {
    if (layer.value === undefined) continue;
    if (!isPlainObject(layer.value)) {
      throw new MergeError(`config layer ${layer.name} must be a plain object`);
    }
    acc = mergeInto(acc, layer.value, [], layer.name, provenance);
  }
  return { value: acc, provenance };
}

function mergeInto(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  path: readonly string[],
  layer: string,
  provenance: Map<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const p = [...path, key];
    if (FORBIDDEN_KEYS.has(key)) {
      throw new MergeError(`config layer ${layer} contains forbidden key "${p.join('.')}"`);
    }
    const next = source[key];
    if (next === undefined) continue;
    const prev = out[key];
    if (isPlainObject(next)) {
      // Object over a non-object (or nothing) starts fresh; object over object merges.
      if (!isPlainObject(prev)) dropSubtree(provenance, p);
      out[key] = mergeInto(isPlainObject(prev) ? prev : {}, next, p, layer, provenance);
      // An empty object still "sets" its path, so provenance can explain it.
      if (Object.keys(next).length === 0) provenance.set(p.join('.'), layer);
    } else {
      dropSubtree(provenance, p);
      out[key] = next;
      provenance.set(p.join('.'), layer);
    }
  }
  return out;
}

function dropSubtree(provenance: Map<string, string>, path: readonly string[]): void {
  const prefix = path.join('.') + '.';
  for (const k of provenance.keys()) if (k.startsWith(prefix)) provenance.delete(k);
}

/** Layer that set `path` or its nearest ancestor; undefined if no layer touched it. */
export function sourceOf(provenance: Provenance, path: readonly PropertyKey[]): string | undefined {
  for (let i = path.length; i > 0; i--) {
    const hit = provenance.get(path.slice(0, i).map(String).join('.'));
    if (hit) return hit;
  }
  return undefined;
}
