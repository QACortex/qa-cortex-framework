// Layered deep merge with provenance (ported from spike S2, ADR 0002). Internal: not exported.
//
// Rules:
//   - plain objects (prototype Object.prototype or null) merge key by key
//   - arrays and every non-plain value (Date, URL, RegExp, Map, class instances, functions) REPLACE
//   - `undefined` is ignored (never deletes a lower layer's value)
//   - `null` is a real value and replaces
//   - inputs are never mutated; the output contains fresh plain objects only
//   - `__proto__`, `constructor` and `prototype` keys are rejected (prototype pollution)

export interface Layer {
  /** Human-readable source used in error messages: 'base', 'profile "staging"', 'overrides'. */
  readonly name: string;
  readonly value: unknown;
}

/** Leaf path (dot-joined) → name of the layer that last set it. */
export type Provenance = ReadonlyMap<string, string>;

export interface MergeResult {
  readonly value: Record<string, unknown>;
  readonly provenance: Provenance;
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto: unknown = Object.getPrototypeOf(value);
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
    const keyPath = [...path, key];
    if (FORBIDDEN_KEYS.has(key)) {
      throw new MergeError(`config layer ${layer} contains forbidden key "${keyPath.join('.')}"`);
    }
    const next = source[key];
    if (next === undefined) continue;
    const prev = out[key];
    if (isPlainObject(next)) {
      // An object over a non-object (or nothing) starts fresh; an object over an object merges.
      if (!isPlainObject(prev)) dropSubtree(provenance, keyPath);
      out[key] = mergeInto(isPlainObject(prev) ? prev : {}, next, keyPath, layer, provenance);
      // An empty object still "sets" its path, so errors can name its layer.
      if (Object.keys(next).length === 0) provenance.set(keyPath.join('.'), layer);
    } else {
      dropSubtree(provenance, keyPath);
      out[key] = next;
      provenance.set(keyPath.join('.'), layer);
    }
  }
  return out;
}

function dropSubtree(provenance: Map<string, string>, path: readonly string[]): void {
  const prefix = `${path.join('.')}.`;
  for (const key of provenance.keys()) if (key.startsWith(prefix)) provenance.delete(key);
}

/**
 * Layer(s) responsible for `path`: the layer that set it or its nearest ancestor; failing
 * that, every layer that set something below it (an object value is recorded by its leaves,
 * so an unknown key holding an object is found this way). Undefined if no layer touched it.
 */
export function sourceOf(provenance: Provenance, path: readonly PropertyKey[]): string | undefined {
  for (let i = path.length; i > 0; i--) {
    const hit = provenance.get(path.slice(0, i).map(String).join('.'));
    if (hit) return hit;
  }
  if (path.length === 0) return undefined;
  const prefix = `${path.map(String).join('.')}.`;
  const layers = new Set<string>();
  for (const [key, layer] of provenance) if (key.startsWith(prefix)) layers.add(layer);
  return layers.size > 0 ? [...layers].join(', ') : undefined;
}
