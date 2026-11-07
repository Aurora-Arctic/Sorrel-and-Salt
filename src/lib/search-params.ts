import { InvalidCursor } from './errors';
import { decodeCursor } from './pagination';

// Next hands a repeated parameter over as a list, and a hand-edited cursor as whatever was typed.

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

/** A hand-edited value is no filter, not an error. A guard, not a cast, so a value the set lost since a link was written is never passed on as valid. */
export function oneOf<T extends string>(
  values: readonly T[],
  raw: string | undefined,
): T | undefined {
  return values.find((value) => value === raw);
}

/** An empty list is no filter; one value given is a list of one. */
export function list(value: string | string[] | undefined): string[] {
  const values = value === undefined ? [] : Array.isArray(value) ? value : [value];
  return values.map((each) => each.trim()).filter((each) => each !== '');
}

/** A hand-edited value matching nothing in the set is dropped, and the rest still filter. */
export function someOf<T extends string>(values: readonly T[], raw: readonly string[]): T[] {
  return raw.flatMap((value) => {
    const kept = oneOf(values, value);
    return kept === undefined ? [] : [kept];
  });
}

export function trimmed(value: string | string[] | undefined): string {
  return single(value)?.trim() ?? '';
}
