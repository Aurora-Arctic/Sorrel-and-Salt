// What a frame bar's end block measures against, shared by the shell's and the public frame's
// (claude-docs/components/app-shell.md, "The end block").

export const pixels = (value: string): number => Number.parseFloat(value) || 0;

// The site nav's width and the gap after it, or 0 where it is not in the bar (a tablet's width).
export const navWidth = (end: HTMLElement): number => {
  const nav = end.parentElement?.querySelector<HTMLElement>(':scope > .app-shell__nav');
  if (!nav || nav.offsetWidth === 0 || !end.parentElement) return 0;
  return nav.offsetWidth + pixels(getComputedStyle(end.parentElement).columnGap);
};

// The room the block and the site nav share: from the end of whatever precedes them in the bar, and a gap, to the
// bar's inner edge. The nav is passed over, so hiding it does not change the room.
export const roomFor = (end: HTMLElement): number => {
  const row = end.parentElement;
  if (!row) return Infinity;
  const style = getComputedStyle(row);
  const box = row.getBoundingClientRect();
  let start = box.left + pixels(style.paddingLeft);
  for (let before = end.previousElementSibling; before; before = before.previousElementSibling) {
    const edge = before.getBoundingClientRect();
    if (edge.width > 0 && !before.matches('.app-shell__nav')) {
      start = edge.right + pixels(style.columnGap);
      break;
    }
  }
  return box.right - pixels(style.paddingRight) - start;
};

// The bar itself and what sits in it before the block change the room; the block's own items change with the text.
export const watched = (end: HTMLElement): Element[] => {
  const row = end.parentElement;
  return [...(row ? [row, ...row.children] : []), ...end.children];
};

// The first step whose width fits the room, or the last where none does.
export const firstFitting = (widths: readonly number[], end: HTMLElement): number => {
  const room = roomFor(end) + 0.5;
  const at = widths.findIndex((width) => width <= room);
  return at === -1 ? widths.length - 1 : at;
};
