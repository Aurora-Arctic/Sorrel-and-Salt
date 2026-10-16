import { InvalidCursor } from './errors';
import { decodeCursor } from './pagination';

// What a page reads off its address: Next hands a repeated parameter over as
// a list, and a hand-edited cursor as whatever was typed. The admin lists
// share both readings.

/** The first value of a parameter given once or more, or none. */
export function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A cursor the codec reads, or none: a hand-edited address gets the first page, not an error. */
export function readableCursor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    decodeCursor(value);
    return value;
  } catch (error) {
    if (error instanceof InvalidCursor) return undefined;
    throw error;
  }
}

/**
 * `raw` when it is one of `values`, else none: the reading of a parameter that
 * takes a fixed set — a role, a privilege, a classification — narrowed to
 * that set. A hand-edited value is no filter rather than an error, as a
 * hand-edited cursor gets the first page. A guard rather than a cast, so a
 * value the set lost since a link was written is never passed on as if valid.
 */
export function oneOf<T extends string>(
  values: readonly T[],
  raw: string | undefined,
): T | undefined {
  return values.find((value) => value === raw);
}

/**
 * Every value of a parameter given once or more, each trimmed and the blank
 * ones dropped: a list filter, such as `?forms=Herb&forms=Oil`, where an
 * empty list is no filter. One value given is a list of one.
 */
export function list(value: string | string[] | undefined): string[] {
  const values = value === undefined ? [] : Array.isArray(value) ? value : [value];
  return values.map((each) => each.trim()).filter((each) => each !== '');
}

/**
 * The values of `raw` that are in `values`, in `raw`'s order: `oneOf` for a
 * list. A hand-edited value matching nothing in the set is dropped, and the
 * rest still filter, rather than the whole list being refused.
 */
export function someOf<T extends string>(values: readonly T[], raw: readonly string[]): T[] {
  return raw.flatMap((value) => {
    const kept = oneOf(values, value);
    return kept === undefined ? [] : [kept];
  });
}

/** The first value of a parameter, trimmed, or `''` for none: a text filter, where blank is no filter. */
export function trimmed(value: string | string[] | undefined): string {
  return single(value)?.trim() ?? '';
}
