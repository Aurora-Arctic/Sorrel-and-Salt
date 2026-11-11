const COUNT_CAP = 99;

/** A count as drawn beside a name: the number, or `99+` once it passes the cap. */
export const cappedCount = (count: number): number | string =>
  count > COUNT_CAP ? `${COUNT_CAP}+` : count;

/** The same count as a screen reader says it: the number, or `more than 99`. */
export const cappedWords = (count: number): string =>
  count > COUNT_CAP ? `more than ${COUNT_CAP}` : String(count);
