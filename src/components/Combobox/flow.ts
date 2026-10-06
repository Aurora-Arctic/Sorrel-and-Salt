import type { FlowShape, FlowSlot } from './types';

// Where a sortable list's chips sit in a given order (MB.170): the wrapping
// row of `.combobox__entries` worked out by hand, from the chips' widths and
// the row's shape measured as a move starts. dnd-kit's `rectSortingStrategy`
// moves each chip onto the box of the chip whose place it takes, which suits
// a grid of equal cells; chips of different widths then overlap, or leave
// gaps (the owner's report). Laid out as the row would lay them out, a chip
// making way lands where it will sit once the move is put down.

// Sub-pixel widths sum a hair past the row a browser still fits them on.
const ROUNDING_PX = 0.5;

/** The row's left edge and its first row's top: the leftmost and topmost chip. */
export function originOf(rects: { left: number; top: number }[]): { left: number; top: number } {
  return {
    left: Math.min(...rects.map((rect) => rect.left)),
    top: Math.min(...rects.map((rect) => rect.top)),
  };
}

/**
 * The row's shape, read off the list as a move starts: its width, and the
 * gaps between chips and rows. A gap the stylesheet does not give — jsdom's
 * — is read off where the chips sit instead.
 */
export function shapeOf(list: HTMLElement, rects: DOMRect[]): FlowShape {
  const style = getComputedStyle(list);
  const height = rects[0]?.height ?? 0;
  const tops = [...new Set(rects.map((rect) => rect.top))].sort((a, b) => a - b);
  const alongRow = rects.slice(1).flatMap((rect, at) => {
    const before = rects[at];
    return before && before.top === rect.top ? [rect.left - before.right] : [];
  });
  const columnGap = Number.parseFloat(style.columnGap);
  const rowGap = Number.parseFloat(style.rowGap);
  const seenGap = alongRow.length > 0 ? Math.max(0, Math.min(...alongRow)) : 0;
  const seenPitch = tops.length > 1 ? tops[1] - tops[0] : height;
  return {
    width: list.getBoundingClientRect().width,
    columnGap: Number.isNaN(columnGap) ? seenGap : columnGap,
    rowPitch: Number.isNaN(rowGap) ? seenPitch : height + rowGap,
  };
}

/** Each chip's place, in the order given, as the wrapping row would put it. */
export function flow(
  widths: number[],
  origin: { left: number; top: number },
  shape: FlowShape,
): FlowSlot[] {
  const right = origin.left + shape.width + ROUNDING_PX;
  let left = origin.left;
  let top = origin.top;
  return widths.map((width) => {
    if (left > origin.left && left + width > right) {
      left = origin.left;
      top += shape.rowPitch;
    }
    const slot = { left, top, width };
    left += width + shape.columnGap;
    return slot;
  });
}

/**
 * The place a key moves the chip at `at` to, among `slots` laid out with it
 * there: Left and Right a place along the list, whichever row that is on;
 * Up and Down onto the row above or below, to the place nearest beneath or
 * above it; Home and End to either end. Past either end, it stays.
 */
export function placeFor(key: string, at: number, slots: FlowSlot[]): number {
  const last = slots.length - 1;
  switch (key) {
    case 'ArrowLeft':
      return Math.max(at - 1, 0);
    case 'ArrowRight':
      return Math.min(at + 1, last);
    case 'Home':
      return 0;
    case 'End':
      return last;
  }
  const here = slots[at];
  if (!here) return at;
  const up = key === 'ArrowUp';
  const tops = slots
    .map((slot) => slot.top)
    .filter((top) => (up ? top < here.top : top > here.top));
  if (tops.length === 0) return at;
  const row = up ? Math.max(...tops) : Math.min(...tops);
  const centre = (slot: FlowSlot) => slot.left + slot.width / 2;
  let nearest = at;
  let distance = Infinity;
  slots.forEach((slot, index) => {
    const away = Math.abs(centre(slot) - centre(here));
    if (slot.top === row && away < distance) {
      nearest = index;
      distance = away;
    }
  });
  return nearest;
}
