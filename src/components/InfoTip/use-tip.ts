'use client';

import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import type { Placement } from '@floating-ui/react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TIP_OPEN_DELAY_MS } from './constants';
import type { Tip, TipTiming } from './types';

// A tip's open state as WCAG 1.4.13 asks: shown on hover (after it rests), focus or tap, kept open while
// the pointer is over it, closed on Escape, blur or leaving. Used by InfoTip, UserList, IconTip and
// Combobox's tooltips (claude-docs/components/info-tip.md, "Behaviour" and "Placement").

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
 * The side a stylesheet asks for through the inherited `--tip-placement`, so a rule can set it for a
 * region (the filter panel's tips open below) or by container query. Read as the tip opens, as it may
 * have changed; anything else, or none, is `fallback`.
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
 * Whether the tip is open, and its three handlers; `canOpen` is asked as it opens, not watched, as a
 * Combobox entry's fit changes with its width. `placement` is the preferred side; `timing` sets the
 * hover waits, none for IconTip. `anchor`, `bubble` and `bubbleStyle` go to the wrapper and bubble.
 */
export function useTip(
  canOpen: () => boolean = ALWAYS,
  placement: Placement = 'top',
  { openDelayMs = TIP_OPEN_DELAY_MS, closeDelayMs = CLOSE_DELAY_MS }: TipTiming = {},
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
    // On the document, as a tip opened by hover has no focus to listen from. Marked handled, so the Escape
    // that closes a tip closes nothing else, such as a modal's `<dialog>` or a changed form's discard
    // (as Combobox/escape.ts does); with the tip shut, Escape is left alone.
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
