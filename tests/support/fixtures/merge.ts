import type { Plain, Overrides } from './types';
// How every factory applies its overrides: a nested object merges key by key,
// an array replaces wholesale, `undefined` says nothing and `null` replaces.
// claude-docs/testing/fixture-factories.md, "Overrides merge; arrays replace".

// A Date, a class instance or an array is a value to replace, not a shape to walk.
function isPlainObject(value: unknown): value is Plain {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function mergeInto(base: Plain, overrides: Plain): Plain {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    const current = base[key];
    base[key] = isPlainObject(current) && isPlainObject(value) ? mergeInto(current, value) : value;
  }
  return base;
}

// `NoInfer` is load-bearing: without it TypeScript infers `T` from the partial overrides and every field becomes optional.
export function mergeFixture<T extends object>(
  defaults: T,
  overrides: NoInfer<Overrides<T>> = {} as Overrides<T>,
): T {
  return mergeInto(structuredClone(defaults) as Plain, overrides as Plain) as T;
}

// Derivation stops when the caller named the field, including with `null`: how a test writes a row the database refuses.
export function stated<T extends object>(overrides: T | undefined, key: PropertyKey): boolean {
  return (
    overrides !== undefined &&
    Object.prototype.hasOwnProperty.call(overrides, key) &&
    (overrides as Plain)[key as string] !== undefined
  );
}
