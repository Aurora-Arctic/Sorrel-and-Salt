'use client';

import {
  autoUpdate,
  flip,
  type Middleware,
  type MiddlewareState,
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

/** The bar at the foot, measured once per placing by the first middleware and read by the three after it. */
const BAR = 'bottomBar';
const measureBar: Middleware = {
  name: BAR,
  // A placing that restarts keeps its data, so the bar is not measured again.
  fn: ({ middlewareData }) => (middlewareData[BAR] ? {} : { data: { px: bottomBarPx() } }),
};

/** The padding all three middleware share: the edge, and the bar at the foot. */
const edges = ({ middlewareData }: MiddlewareState) => ({
  top: EDGE_PX,
  left: EDGE_PX,
  right: EDGE_PX,
  bottom: EDGE_PX + ((middlewareData[BAR] as { px: number } | undefined)?.px ?? 0),
});

/** Sets an inline style only when it differs, since every write re-checks the page's `:has()` rules. */
function setStyle(element: HTMLElement, property: string, value: string): void {
  if (element.style.getPropertyValue(property) !== value)
    element.style.setProperty(property, value);
}

/** Room the phone's fixed bottom bar takes from the foot of the window, or 0; measured because its height includes the device's safe area (claude-docs/components/combobox.md, "Bottom bar room"). */
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
    follow = false,
  }: {
    /** As wide as the anchor; false keeps the list's own width. */
    matchWidth?: boolean;
    /** Where it opens when there is room; it flips to the other side when not. */
    placement?: Placement;
    /** Pixels between the anchor and the list. */
    gap?: number;
    /** Followed while closed too, so a list that closes only for a pending lookup reopens without subscribing again. */
    follow?: boolean;
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
      measureBar,
      offset(gap),
      // A function, so the bar is read at every placement; a list that would open behind it flips above.
      flip((state) => ({ padding: edges(state) })),
      shift((state) => ({ padding: edges(state) })),
      size((state) => ({
        padding: edges(state),
        // As wide as the anchor unless told not to be, no taller than the room it has.
        apply({ rects, availableHeight, elements: { floating } }) {
          if (matchWidth) setStyle(floating, 'width', `${rects.reference.width}px`);
          setStyle(floating, '--combobox-list-room', `${Math.max(0, availableHeight)}px`);
        },
      })),
    ],
  });

  // Followed only while open, or while told to: a closed list has nothing to follow.
  const { reference, floating } = elements;
  const following = isOpen || follow;
  useEffect(() => {
    if (!following || !reference || !floating) return;
    return autoUpdate(reference, floating, update);
  }, [following, reference, floating, update]);

  return {
    setControl,
    setList: refs.setFloating,
    listStyle: floatingStyles,
    placement,
  };
}
