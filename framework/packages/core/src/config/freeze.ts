import { isPlainObject } from './merge.js';

/**
 * Deep-freeze plain objects and arrays only. Class instances (URL, Date, user objects) are
 * left alone: they may be shared by reference with user code, and freezing them would
 * silently change someone else's object. Internal: not exported.
 */
export function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
    return Object.freeze(value);
  }
  if (isPlainObject(value)) {
    for (const item of Object.values(value)) deepFreeze(item);
    return Object.freeze(value);
  }
  return value;
}
