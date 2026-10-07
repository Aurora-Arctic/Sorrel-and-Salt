import { colordx } from '@colordx/core';

// Whether two groups' colours in one theme stand far enough apart to tell
// their chips apart (M5.6b): the picker warns, it never refuses. Kept apart
// from group-colors.ts because the validation schema reaches that file and,
// through it, nothing but zod (claude-docs/validation.md).

/**
 * How far apart two colours look: the distance between them in OKLab, where a
 * step of the same size reads as the same change anywhere in the gamut. A
 * nudge of a few hex steps moves a colour about 0.01–0.03, and the seeded
 * groups sit further apart than NEAR_COLOR_DELTA within each theme.
 */
export function colorDistance(a: string, b: string): number {
  const x = colordx(a).toOklab();
  const y = colordx(b).toOklab();
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
}

/**
 * The distance under which a group's colour is warned as too close to
 * another group's, in the same theme: inside every seeded neighbour, outside
 * any nudge of one.
 */
export const NEAR_COLOR_DELTA = 0.05;

/** The nearest of `others` to `hex` that lies within NEAR_COLOR_DELTA, or none. */
export function nearColor<T extends { hex: string }>(
  hex: string,
  others: readonly T[],
): T | undefined {
  let nearest: { other: T; distance: number } | undefined;
  for (const other of others) {
    const distance = colorDistance(hex, other.hex);
    if (distance < NEAR_COLOR_DELTA && (!nearest || distance < nearest.distance)) {
      nearest = { other, distance };
    }
  }
  return nearest?.other;
}
