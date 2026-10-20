'use client';

import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import type { Placement } from '@floating-ui/react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tip, TipTiming } from './types';

// A tip's open state as WCAG 1.4.13 asks it to behave: shown on hover, focus
// or a tap, kept open while the pointer is over it, and closed on Escape,
// blur, or the pointer leaving. Hover waits for the pointer to rest, so a
// pointer crossing the page on its way somewhere else opens nothing; focus and
// a tap are asked for on purpose and open at once. InfoTip's, and every other tip's beside a
// control: UserList's, IconTip's beside every Edit pencil, and Combobox's entry
// and qualifier tooltips
// (claude-docs/components/info-tip.md, "Behaviour").
//
// It also places the bubble. A bubble pinned by CSS to one edge of its control
// runs off the screen wherever the control's position varies, so each is
// placed as it opens on Floating UI, the standard tool, as Combobox's list is
// (Combobox/position.ts): on the side asked for, flipped to the other when
// there is no room, and shifted along that side until it is inside the screen.
// It is fixed, so no scrolling or clipping ancestor can cut it, and followed
// only while open. Closed, or before the script has run, the stylesheet's
// `position: fixed` at the origin keeps it out of the flow, invisible as ever
// and its text still in the page (claude-docs/components/info-tip.md,
// "Placement").

// How long a pointer rests on a control before its tip opens: the owner's call
// (claude-docs/components/info-tip.md, "Behaviour").
const OPEN_DELAY_MS = 300;

// Long enough to cross from the control onto the tip.
const CLOSE_DELAY_MS = 150;

// The default `canOpen`, at module level so `show` keeps one identity for a
// caller that passes none; a default written in the signature would be a new
// function every render.
const ALWAYS = () => true;

/** Space kept between a bubble and the edge of the screen. */
const EDGE_PX = 8;

/** Space between a bubble and the control it belongs to. */
const GAP_PX = 4;

// The sides a stylesheet may ask for with `--tip-placement`.
const SIDES = new Set<string>([
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end',
]);

/**
 * The side a stylesheet asks for. `--tip-placement` is a custom property, so a
 * rule can set it for a whole region (the filter panel's tips open below) or
 * by a container query (a stacked table's), and it inherits to every tip
 * inside. Read as the tip opens, as `canOpen` is, since a media or container
 * query may have changed it since. Anything else, or none, is `fallback`.
 */
function sideFor(anchor: Element | null | undefined, fallback: Placement): Placement {
  if (!anchor) return fallback;
  const asked = getComputedStyle(anchor).getPropertyValue('--tip-placement').trim();
  return SIDES.has(asked) ? (asked as Placement) : fallback;
}

/**
 * The edges a bubble keeps inside: the nearest ancestor marked
 * `data-tip-boundary` (the filter panel, which is narrower than the screen
 * and whose tips must not leave it), else the screen.
 */
const edges = ({ elements }: { elements: { reference: unknown } }) => {
  const reference = elements.reference;
  const marked = reference instanceof Element ? reference.closest('[data-tip-boundary]') : null;
  return marked ? { padding: EDGE_PX, boundary: marked } : { padding: EDGE_PX };
};

/**
 * Whether the tip is open, and its three handlers. `canOpen` is asked as it
 * opens rather than watched: whether a Combobox entry's text fits changes with
 * the control's width, and only matters at the moment someone looks.
 *
 * `placement` is the side the bubble prefers, `top` unless a stylesheet's
 * `--tip-placement` says otherwise. `timing` sets how long a hover waits to
 * open (`showSoon`) and a leave to close (`hideSoon`); IconTip's bubble cannot be
 * hovered, so it closes with no wait. The caller hands `anchor` to the element
 * the bubble belongs to (the wrapper that hears the hover), `bubble` to the
 * bubble, and `bubbleStyle` to the bubble's `style`.
 */
export function useTip(
  canOpen: () => boolean = ALWAYS,
  placement: Placement = 'top',
  { openDelayMs = OPEN_DELAY_MS, closeDelayMs = CLOSE_DELAY_MS }: TipTiming = {},
): Tip {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<Placement>(placement);
  const opening = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { refs, elements, floatingStyles, update } = useFloating({
    open,
    placement: side,
    strategy: 'fixed',
    // Left and top rather than a transform, which the bubble's fade owns.
    transform: false,
    middleware: [offset(GAP_PX), flip(edges), shift(edges)],
  });

  // Followed only while open: a closed bubble has nothing to follow.
  const { reference, floating } = elements;
  useEffect(() => {
    if (!open || !reference || !floating) return;
    return autoUpdate(reference, floating, update);
  }, [open, reference, floating, update]);

  const show = useCallback(() => {
    clearTimeout(opening.current);
    clearTimeout(closing.current);
    if (!canOpen()) return;
    setSide(sideFor(refs.reference.current as Element | null, placement));
    setOpen(true);
  }, [canOpen, placement, refs]);
  // Already open, or already waiting, a hover changes nothing but a pending
  // close: the pointer is back.
  const showSoon = useCallback(() => {
    clearTimeout(closing.current);
    clearTimeout(opening.current);
    opening.current = setTimeout(show, openDelayMs);
  }, [show, openDelayMs]);
  const hide = useCallback(() => {
    clearTimeout(opening.current);
    clearTimeout(closing.current);
    setOpen(false);
  }, []);
  const hideSoon = useCallback(() => {
    clearTimeout(opening.current);
    clearTimeout(closing.current);
    if (closeDelayMs <= 0) setOpen(false);
    else closing.current = setTimeout(() => setOpen(false), closeDelayMs);
  }, [closeDelayMs]);

  useEffect(() => {
    if (!open) return;
    // On the document: a tip opened by hover has no focus to listen from.
    // Marked handled, so the Escape that closes a tip closes nothing else:
    // inside a modal the `<dialog>` would take it as a close request too,
    // shutting the modal or asking a changed form to discard (MB.115; the
    // same as Combobox/escape.ts). With the tip shut, Escape is left alone.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      hide();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, hide]);

  useEffect(
    () => () => {
      clearTimeout(opening.current);
      clearTimeout(closing.current);
    },
    [],
  );

  return {
    open,
    show,
    showSoon,
    hide,
    hideSoon,
    anchor: refs.setReference,
    bubble: refs.setFloating,
    // The bubble's own `right` and `bottom` are cleared so a stylesheet that
    // still sets them cannot stretch it between top and bottom.
    bubbleStyle: { ...floatingStyles, right: 'auto', bottom: 'auto' },
  };
}
