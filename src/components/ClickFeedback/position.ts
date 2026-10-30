import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import type { Middleware } from '@floating-ui/react-dom';
import { useEffect } from 'react';
import type { CSSProperties } from 'react';

// Where the callout and badge go, on Floating UI as InfoTip's bubble is (InfoTip/use-tip.ts). The
// callout is fixed, so no ancestor cuts it; the badge is absolute, so it scrolls and clips with its
// control (claude-docs/components/click-feedback.md, "Placement").

/**
 * The control's bottom edge to the callout's top: room for the arrow, whose tip
 * then stands about 11.5px under the control.
 */
const GAP_PX = 20;

/** The callout's nearest approach to the edge of its box, as its max-width keeps. */
const EDGE_PX = 16;

/**
 * The closest the arrow comes to either end of the callout: past the corner's
 * rounding, so its point never leaves the straight edge.
 */
const ARROW_INSET_PX = 14;

/** The callout's widest, as its stylesheet's `max-inline-size` keeps: 20rem. */
const MAX_REM = 20;

/**
 * The box the callout keeps inside: the nearest `data-tip-boundary` ancestor, else the `<dialog>` the
 * control sits in, else the screen. Asked of the node, not `instanceof Element`, since a story in
 * Storybook's iframe runs in the page around it (claude-docs/components/click-feedback.md).
 */
const boxOf = (reference: unknown): Element | null => {
  const node = reference as Element | null;
  return typeof node?.closest === 'function' ? node.closest('[data-tip-boundary], dialog') : null;
};

const edges = ({ elements }: { elements: { reference: unknown } }) => {
  const box = boxOf(elements.reference);
  return box ? { padding: EDGE_PX, boundary: box } : { padding: EDGE_PX };
};

/**
 * In a box narrower than the callout at its widest (a dialog on a phone), the callout narrows to the
 * larger room either alignment leaves, so it still stands start or end under the control. Set on the
 * element, as Floating UI's `size` does, so the rects are measured again at the new width.
 */
const narrow: Middleware = {
  name: 'narrow',
  fn: ({ elements }) => {
    const node = elements.floating;
    const box = boxOf(elements.reference);
    // The control's own document and window, which in an iframed story are
    // the frame's rather than the script's.
    const doc = (elements.reference as Element).ownerDocument;
    const view = doc.defaultView ?? window;
    const rem = parseFloat(view.getComputedStyle(doc.documentElement).fontSize) || 16;
    const viewport = doc.documentElement.clientWidth;
    const { left, right } = box ? box.getBoundingClientRect() : { left: 0, right: viewport };
    const widest = Math.min(MAX_REM * rem, viewport - 2 * EDGE_PX);
    // From the page, not `rects`: a fixed callout's rects are measured from
    // its containing block, which a dialog's containment can make the dialog.
    const control = (elements.reference as Element).getBoundingClientRect();
    const room =
      right - left - 2 * EDGE_PX < widest
        ? `${Math.max(right - EDGE_PX - control.x, control.x + control.width - (left + EDGE_PX))}px`
        : '';
    if (node.style.getPropertyValue('--click-feedback-room') === room) return {};
    if (room) node.style.setProperty('--click-feedback-room', room);
    else node.style.removeProperty('--click-feedback-room');
    return { reset: { rects: true } };
  },
};

/**
 * Where along the callout's top the arrow stands: under the middle of the
 * control, held back from the rounded corners. Last in the chain, so it reads
 * the callout's final place.
 */
const pointAt: Middleware = {
  name: 'pointAt',
  fn: ({ x, rects }) => {
    const middle = rects.reference.x + rects.reference.width / 2 - x;
    const end = rects.floating.width - ARROW_INSET_PX;
    return { data: { x: Math.min(Math.max(middle, ARROW_INSET_PX), end) } };
  },
};

interface Placed {
  setFloating: (node: HTMLElement | null) => void;
  style: CSSProperties;
  placed: boolean;
}

/** Follows the control while `active`: a closed piece has nothing to follow. */
function useFollow(
  active: boolean,
  reference: Element | null,
  floating: HTMLElement | null,
  update: () => void,
): void {
  useEffect(() => {
    if (!active || !reference || !floating) return;
    return autoUpdate(reference, floating, update);
  }, [active, reference, floating, update]);
}

/**
 * The callout's place: bottom-start, else bottom-end, else pinned inside its box. Never above: the
 * arrow points up, and a callout over the control would cover what it is about.
 */
export function useCalloutPlace(anchor: HTMLElement | null, drawn: boolean): Placed {
  const { refs, elements, floatingStyles, update, isPositioned, middlewareData } = useFloating({
    open: drawn,
    elements: { reference: anchor },
    placement: 'bottom-start',
    strategy: 'fixed',
    // Left and top rather than a transform, so the fade owns nothing it shares.
    transform: false,
    middleware: [
      narrow,
      offset(GAP_PX),
      // The alignment alone is checked: the side stays the bottom.
      flip((state) => ({
        ...edges(state),
        mainAxis: false,
        fallbackPlacements: ['bottom-end'],
        fallbackStrategy: 'initialPlacement',
      })),
      shift(edges),
      pointAt,
    ],
  });
  useFollow(drawn, elements.reference as Element | null, elements.floating, update);

  const arrow = (middlewareData.pointAt as { x?: number } | undefined)?.x;
  return {
    setFloating: refs.setFloating,
    style: {
      ...floatingStyles,
      right: 'auto',
      bottom: 'auto',
      ...(arrow === undefined ? {} : { '--click-feedback-arrow-x': `${arrow}px` }),
    } as CSSProperties,
    placed: isPositioned,
  };
}

/**
 * The badge's place: over a bordered control's top right corner, its centre 0.375 of its size in from
 * each edge. `beside`, for a borderless control, sits to its right, touching; the stylesheet's margin
 * (`.click-feedback__badge--beside`) holds it clear.
 */
export function useBadgePlace(anchor: HTMLElement | null, drawn: boolean, beside: boolean): Placed {
  const { refs, elements, floatingStyles, update, isPositioned } = useFloating({
    open: drawn,
    elements: { reference: anchor },
    placement: beside ? 'right' : 'top-end',
    strategy: 'absolute',
    transform: false,
    middleware: [
      // Read from the placement, not from `beside`: Floating UI keeps the
      // middleware it has while a new one prints the same source, so a
      // closure over `beside` would keep the first value it saw.
      offset(({ rects, placement }) => {
        const size = rects.floating.height;
        return placement === 'right'
          ? { mainAxis: 0 }
          : { mainAxis: -size * 0.625, crossAxis: size * 0.375 };
      }),
    ],
  });
  useFollow(drawn, elements.reference as Element | null, elements.floating, update);

  return {
    setFloating: refs.setFloating,
    style: { ...floatingStyles, right: 'auto', bottom: 'auto' },
    placed: isPositioned,
  };
}
