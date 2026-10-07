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
