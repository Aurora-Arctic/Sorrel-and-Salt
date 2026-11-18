/**
 * The height of the sticky top bar over an element, in pixels: the frame publishes it as the inherited
 * `--sticky-top` (a rem or px length), the one place the bar's height is stated. 0 where none is published.
 */
export function stickyTopInset(element: Element): number {
  const raw = getComputedStyle(element).getPropertyValue('--sticky-top').trim();
  const amount = parseFloat(raw);
  if (!Number.isFinite(amount)) return 0;
  if (raw.endsWith('rem')) {
    return amount * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
  }
  return raw.endsWith('px') ? amount : 0;
}
