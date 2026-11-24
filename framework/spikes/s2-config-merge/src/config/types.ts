// Type helpers mirroring the runtime merge rules in merge.ts.

/** Values the merge treats as atomic (replaced, never merged). Keep in sync with isPlainObject. */
type Atomic =
  | ((...args: never[]) => unknown)
  | readonly unknown[]
  | Date
  | RegExp
  | URL
  | Map<unknown, unknown>
  | Set<unknown>;

/** Overlay shape: every plain-object key optional, recursively. Arrays replace, so they stay whole. */
export type DeepPartial<T> = T extends Atomic
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> | undefined }
    : T;

/** Result shape: plain objects and arrays deeply readonly (they are deep-frozen at runtime). */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends Date | RegExp | URL | Map<unknown, unknown> | Set<unknown>
      ? T
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;
