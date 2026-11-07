import { colordx } from '@colordx/core';

// Whether two groups' colours stand far enough apart in one theme; the picker warns, it never refuses. Apart
// from group-colors.ts, which the validation schema reaches (claude-docs/validation.md).

/** OKLab, where equal steps read as equal changes anywhere in the gamut. A nudge of a few hex steps moves a colour about 0.01–0.03. */
export function colorDistance(a: string, b: string): number {
  const x = colordx(a).toOklab();
  const y = colordx(b).toOklab();
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
}

/** Inside every seeded neighbour, outside any nudge of one. */
export const NEAR_COLOR_DELTA = 0.05;

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
