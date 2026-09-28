// How every factory applies its overrides: a nested object merges key by key,
// an array replaces wholesale, `undefined` says nothing and `null` replaces.
// claude-docs/testing.md, "Overrides merge; arrays replace".

type Plain = Record<string, unknown>;

/** Overrides for `T`: every property optional all the way down, arrays left whole. */
export type Overrides<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: Overrides<T[K]> }
    : T;

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

/**
 * `defaults` with `overrides` applied — a fresh deep copy every call, so two
 * fixtures from one module constant share no array or nested object.
 *
 * `NoInfer` is load-bearing: without it TypeScript infers `T` from the partial
 * overrides and hands back a fixture whose every field is optional.
 */
export function mergeFixture<T extends object>(
  defaults: T,
  overrides: NoInfer<Overrides<T>> = {} as Overrides<T>,
): T {
  return mergeInto(structuredClone(defaults) as Plain, overrides as Plain) as T;
}

/**
 * Did the caller name this field? Derivation stops when they did, including
 * with `null` — how a test writes a row the database is meant to refuse.
 */
export function stated<T extends object>(overrides: T | undefined, key: PropertyKey): boolean {
  return (
    overrides !== undefined &&
    Object.prototype.hasOwnProperty.call(overrides, key) &&
    (overrides as Plain)[key as string] !== undefined
  );
}
