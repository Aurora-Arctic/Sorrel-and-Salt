// M1.25 — how every factory applies its overrides: an override is read as a
// *sentence about the default* rather than as a replacement for it. A nested
// object merges key by key, an array replaces wholesale, `undefined` says
// nothing (it is what an absent optional property reads as) and `null` replaces
// — which is how a test writes the row it expects the database to reject.
//
// No `deepmerge` dependency: those three rules are the whole library, and the
// one that matters most (arrays replace) is the one a general-purpose merge is
// least likely to agree with us about. The argument at length:
// claude-docs/testing.md, "Overrides merge; arrays replace".

type Plain = Record<string, unknown>;

/**
 * Overrides for `T`: every property optional, all the way down, with arrays
 * left whole — an array override is a new array rather than a partial of the
 * old one, which is the replace rule stated in the type.
 */
export type Overrides<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: Overrides<T[K]> }
    : T;

// Plain objects only. A Date, a class instance or an array is a value to be
// replaced rather than a shape to be walked into.
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
 * `defaults` with `overrides` applied — a fresh object every call.
 *
 * The defaults are cloned before anything is written into them, so a factory
 * can keep its defaults in a module constant and two fixtures built from it
 * still share no array and no nested object. A test that pushes a category
 * onto one fixture would otherwise be editing the next test's, the same hazard
 * `asUser` returns a fresh session to avoid.
 *
 * `NoInfer` on the overrides is load-bearing: without it TypeScript infers `T`
 * from whichever argument it sees fit, settles on the *partial* shape of the
 * overrides, and hands the caller back a fixture whose every field is
 * optional — which typechecks at the factory and fails at every call site.
 */
export function mergeFixture<T extends object>(
  defaults: T,
  overrides: NoInfer<Overrides<T>> = {} as Overrides<T>,
): T {
  return mergeInto(structuredClone(defaults) as Plain, overrides as Plain) as T;
}

/**
 * Did the caller *name* this field, or is it ours to derive?
 *
 * The factories fill in fields that have to agree with each other — an
 * ingredient's `canonicalName` with its `nomenclature`, a spell layer's `name`
 * with its `ingredientId` — and they only do it for a field the override left
 * alone. A field the caller named is theirs, including when they named it
 * `null`, which is how a test asks for a row the database is meant to refuse.
 */
export function stated<T extends object>(overrides: T | undefined, key: PropertyKey): boolean {
  return (
    overrides !== undefined &&
    Object.prototype.hasOwnProperty.call(overrides, key) &&
    (overrides as Plain)[key as string] !== undefined
  );
}
