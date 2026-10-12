'use client';

import { type RefObject, useLayoutEffect } from 'react';

// Whether Filter and Clear have wrapped onto a line of their own, and if so
// how far the fields above them reach, the owner's call at MB.115's review:
// alone on their line, they span the fields above, not their own two
// labels' width. CSS cannot ask whether a flex item wrapped, so this
// measures it: `data-alone` on the block and `--filter-actions-width`, the
// row's start to the furthest field's end, which `.filter-row__actions`
// reads (claude-docs/components/filter-form.md, "Styling"). Measured again
// on every render and as the row resizes, its own size set aside first so
// a block stretched last time does not keep itself apart.

/** A field ending at or above the block's top shares no line with it; a pixel spares rounding. */
const ROUNDING = 1;

export function useActionsLine(
  row: RefObject<HTMLFormElement | null>,
  block: RefObject<HTMLDivElement | null>,
): void {
  useLayoutEffect(() => {
    const form = row.current;
    const actions = block.current;
    if (!form || !actions) return;

    const measure = () => {
      delete actions.dataset.alone;
      actions.style.removeProperty('--filter-actions-width');
      const fields = [...form.children].filter((child) => child !== actions);
      if (fields.length === 0) return;
      const top = actions.getBoundingClientRect().top;
      const boxes = fields.map((field) => field.getBoundingClientRect());
      if (boxes.some((box) => box.bottom > top + ROUNDING)) return;
      const reach = Math.max(...boxes.map((box) => box.right)) - form.getBoundingClientRect().left;
      // Nothing laid out, as in a test's DOM: left as its own size.
      if (reach <= 0) return;
      actions.style.setProperty('--filter-actions-width', `${reach}px`);
      actions.dataset.alone = '';
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(form);
    return () => observer.disconnect();
  });
}
