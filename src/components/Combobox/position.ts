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
// clip it (claude-docs/components/combobox.md, "Where the list opens").

/** Space kept between the list and the edge of the screen. */
const EDGE_PX = 8;

export function useListPosition(isOpen: boolean, anchor?: HTMLElement | null) {
  const [control, setControl] = useState<HTMLElement | null>(null);

  const { refs, elements, floatingStyles, placement, update } = useFloating({
    open: isOpen,
    // The anchor places the list and gives it its width; the box when none.
    elements: { reference: anchor ?? control },
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [
      offset(4),
      flip({ padding: EDGE_PX }),
      shift({ padding: EDGE_PX }),
      size({
        padding: EDGE_PX,
        // As wide as what it is anchored to, and no taller than the room it
        // has: the stylesheet caps it at its own height besides.
        apply({ rects, availableHeight, elements: { floating } }) {
          floating.style.width = `${rects.reference.width}px`;
          floating.style.setProperty('--combobox-list-room', `${Math.max(0, availableHeight)}px`);
        },
      }),
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
