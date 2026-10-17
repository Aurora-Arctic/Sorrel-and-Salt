'use client';

import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';
import { useEffect, useState } from 'react';

// Where an open list sits (MB.154, the owner's calls): beneath the box, as
// wide as what it is anchored to — a list field's whole row, its box and its
// Add together, or the box alone — and never off the screen: it flips above
// when there is more room there, and is no taller than the room it has. On
// Floating UI, the standard tool, rather than measuring by hand: the flip,
// the room, and following a scroll or a resize while open are its own. Fixed
// rather than absolute, so a scrolling ancestor — M8.16's modal — cannot
// clip it (claude-docs/components/combobox.md, "Where the list opens"). An
// entry's summary opens on the same placement, as wide as its own content
// rather than its chip (`matchWidth: false`).

/** Space kept between the list and the edge of the screen. */
const EDGE_PX = 8;

/** The padding all three middleware share: the edge, and the bar at the foot. */
const edges = () => ({
  top: EDGE_PX,
  left: EDGE_PX,
  right: EDGE_PX,
  bottom: EDGE_PX + bottomBarPx(),
});

/**
 * Room the phone's fixed bottom bar takes from the foot of the window, or 0
 * when it is not shown. Measured rather than restated from the Sass tokens,
 * because the bar's height includes the device's safe area, which only the
 * browser knows. Found by its class, the one name the shell's own stylesheets
 * already key on (`html:has(.section-nav)`), rather than a prop threaded
 * through every Combobox; it is read when a list is placed, so the bar
 * appearing at a narrower window is picked up on the next resize.
 */
function bottomBarPx(): number {
  const bar = document.querySelector('.section-nav');
  if (!bar || getComputedStyle(bar).position !== 'fixed') return 0;
  return bar.getBoundingClientRect().height;
}

export function useListPosition(
  isOpen: boolean,
  anchor?: HTMLElement | null,
  { matchWidth = true }: { matchWidth?: boolean } = {},
) {
  const [control, setControl] = useState<HTMLElement | null>(null);

  const { refs, elements, floatingStyles, placement, update } = useFloating({
    open: isOpen,
    // The anchor places the list and gives it its width; the box when none.
    elements: { reference: anchor ?? control },
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [
      offset(4),
      // A function, so the bar is measured at every placement. Its room is
      // taken off the foot of the window: a list that would open behind it
      // flips above instead.
      flip(() => ({ padding: edges() })),
      shift(() => ({ padding: edges() })),
      size(() => ({
        padding: edges(),
        // As wide as what it is anchored to, unless told not to be, and no
        // taller than the room it has: the stylesheet caps it at its own
        // height besides.
        apply({ rects, availableHeight, elements: { floating } }) {
          if (matchWidth) floating.style.width = `${rects.reference.width}px`;
          floating.style.setProperty('--combobox-list-room', `${Math.max(0, availableHeight)}px`);
        },
      })),
    ],
  });

  // Followed only while open: every box's list is always in the page, as
  // Downshift asks, and a closed one has nothing to follow.
  const { reference, floating } = elements;
  useEffect(() => {
    if (!isOpen || !reference || !floating) return;
    return autoUpdate(reference, floating, update);
  }, [isOpen, reference, floating, update]);

  return {
    setControl,
    setList: refs.setFloating,
    listStyle: floatingStyles,
    placement,
  };
}
