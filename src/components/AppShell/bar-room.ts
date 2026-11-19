import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

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

// A fold that takes the focused item out of the bar would drop the focus to the page's start: it goes instead to the
// control that now holds that item, found in the block by `heir`.
export const useFocusKeptThroughFold = (
  end: RefObject<HTMLElement | null>,
  fit: number | null,
  heir: string,
): void => {
  const held = useRef<Element | null>(null);
  useEffect(() => {
    const block = end.current;
    if (!block) return;
    const take = (event: FocusEvent): void => {
      held.current = event.target instanceof Element ? event.target : null;
    };
    // Left for somewhere else, it holds nothing; a removal, checked once the commit is done, still does.
    const leave = (event: FocusEvent): void => {
      const left = event.target;
      queueMicrotask(() => {
        if (left instanceof Element && left.isConnected && held.current === left)
          held.current = null;
      });
    };
    block.addEventListener('focusin', take);
    block.addEventListener('focusout', leave);
    return () => {
      block.removeEventListener('focusin', take);
      block.removeEventListener('focusout', leave);
    };
  }, [end]);
  useLayoutEffect(() => {
    const lost = held.current;
    const active = document.activeElement;
    if (!lost || lost.isConnected || (active !== null && active !== document.body)) return;
    held.current = null;
    end.current?.querySelector<HTMLElement>(heir)?.focus();
  }, [end, fit, heir]);
};
