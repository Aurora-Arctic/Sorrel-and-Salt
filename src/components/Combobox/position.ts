'use client';

import {
  autoUpdate,
  flip,
  offset,
  type Placement,
  shift,
  size,
  useFloating,
} from '@floating-ui/react-dom';
import { useEffect, useState } from 'react';

// Where an open list sits: beneath the box, as wide as its anchor, flipped above when there is more room there, on Floating UI, fixed so a scrolling ancestor cannot clip it
// (claude-docs/components/combobox.md, "Where the list opens").

/** Space kept between the list and the edge of the screen. */
const EDGE_PX = 8;

/** The padding all three middleware share: the edge, and the bar at the foot. */
const edges = () => ({
  top: EDGE_PX,
  left: EDGE_PX,
  right: EDGE_PX,
  bottom: EDGE_PX + bottomBarPx(),
});

/** Room the phone's fixed bottom bar takes from the foot of the window, or 0; measured because its height includes the device's safe area (claude-docs/components/combobox.md, "Component notes"). */
function bottomBarPx(): number {
  const bar = document.querySelector('.section-nav');
  if (!bar || getComputedStyle(bar).position !== 'fixed') return 0;
  return bar.getBoundingClientRect().height;
}

export function useListPosition(
  isOpen: boolean,
  anchor?: HTMLElement | null,
  {
    matchWidth = true,
    placement: preferred = 'bottom-start',
    gap = 4,
  }: {
    /** As wide as the anchor; false keeps the list's own width. */
    matchWidth?: boolean;
    /** Where it opens when there is room; it flips to the other side when not. */
    placement?: Placement;
    /** Pixels between the anchor and the list. */
    gap?: number;
  } = {},
) {
  const [control, setControl] = useState<HTMLElement | null>(null);

  const { refs, elements, floatingStyles, placement, update } = useFloating({
    open: isOpen,
    // The anchor places the list and gives it its width; the box when none.
    elements: { reference: anchor ?? control },
    placement: preferred,
    strategy: 'fixed',
    middleware: [
      offset(gap),
      // A function, so the bar is measured at every placement; a list that would open behind it flips above.
      flip(() => ({ padding: edges() })),
      shift(() => ({ padding: edges() })),
      size(() => ({
        padding: edges(),
        // As wide as the anchor unless told not to be, no taller than the room it has.
        apply({ rects, availableHeight, elements: { floating } }) {
          if (matchWidth) floating.style.width = `${rects.reference.width}px`;
          floating.style.setProperty('--combobox-list-room', `${Math.max(0, availableHeight)}px`);
        },
      })),
    ],
  });

  // Followed only while open: a closed list has nothing to follow.
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
