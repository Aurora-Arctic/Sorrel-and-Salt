/** A computed CSS length in pixels, as `getComputedStyle` gives it (`"12px"`); 0 for `normal`, `auto` or empty. */
export function pixels(value: string): number {
  return Number.parseFloat(value) || 0;
}
