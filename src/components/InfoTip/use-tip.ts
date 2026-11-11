'use client';

import { flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';
import type { Placement } from '@floating-ui/react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAutoPosition } from '../../lib/use-auto-position';
import { useDismiss } from '../../lib/use-dismiss';
import { TIP_OPEN_DELAY_MS } from './constants';
import type { Tip, TipOptions } from './types';

// A tip's open state as WCAG 1.4.13 asks: shown on hover (after it rests), focus or tap, kept open while
// the pointer is over it, closed on Escape, blur or leaving. Used by InfoTip, UserList, IconTip and
// Combobox's tooltips (claude-docs/components/info-tip.md, "Contracts" and "Placement").

const CLOSE_DELAY_MS = 150;

// The default `canOpen`, at module level so `show` keeps one identity for a
// caller that passes none; a default written in the signature would be a new
// function every render.
const ALWAYS = () => true;

const EDGE_PX = 8;

const GAP_PX = 4;

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
 * The height of the sticky top bar over the reference, in pixels: the frame publishes it as the inherited
 * `--sticky-top` (a rem or px length), the one place the bar's height is stated. 0 where none is published.
 */
function barInset(reference: Element): number {
  const raw = getComputedStyle(reference).getPropertyValue('--sticky-top').trim();
  const amount = parseFloat(raw);
  if (!Number.isFinite(amount)) return 0;
  if (raw.endsWith('rem')) {
    return amount * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
  }
  return raw.endsWith('px') ? amount : 0;
}

/**
 * The edges a bubble keeps inside: the nearest ancestor marked
 * `data-tip-boundary` (the filter panel, which is narrower than the screen
 * and whose tips must not leave it), else the screen less the sticky top bar,
 * so a bubble flips or shifts before it slides under the bar.
 */
const edges = ({ elements }: { elements: { reference: unknown } }) => {
  const reference = elements.reference;
  const marked = reference instanceof Element ? reference.closest('[data-tip-boundary]') : null;
  if (marked) return { padding: EDGE_PX, boundary: marked };
  const top =
    reference instanceof Element ? Math.max(EDGE_PX, barInset(reference) + EDGE_PX) : EDGE_PX;
  return { padding: { top, right: EDGE_PX, bottom: EDGE_PX, left: EDGE_PX } };
};

/**
 * `canOpen` is asked as the tip opens, not watched, as a Combobox entry's fit changes with its
 * width.
 */
export function useTip(
  canOpen: () => boolean = ALWAYS,
  placement: Placement = 'top',
  {
    openDelayMs = TIP_OPEN_DELAY_MS,
    closeDelayMs = CLOSE_DELAY_MS,
    reference: referenceOverride,
    gapPx = GAP_PX,
    minWidthPx,
    pinnable = false,
    onEscape,
  }: TipOptions = {},
): Tip {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<Placement>(placement);
  const opening = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  // A pinned tip stays open while the pointer leaves, until a second press, a blur or Escape.
  const pinned = useRef(false);
  const anchorNode = useRef<HTMLElement | null>(null);

  const { refs, elements, floatingStyles, update } = useFloating({
    open,
    placement: side,
    strategy: 'fixed',
    ...(referenceOverride ? { elements: { reference: referenceOverride } } : {}),
    // Left and top rather than a transform, which the bubble's fade owns.
    transform: false,
    middleware: [
      offset(gapPx),
      flip(edges),
      shift(edges),
      ...(minWidthPx === undefined
        ? []
        : [
            size({
              padding: EDGE_PX,
              // As wide as the reference, or the least width.
              apply({ rects, elements: { floating } }) {
                floating.style.width = `${Math.max(rects.reference.width, minWidthPx)}px`;
              },
            }),
          ]),
    ],
  });

  useAutoPosition(open, elements.reference as Element | null, elements.floating, update);

  const show = useCallback(() => {
    clearTimeout(opening.current);
    clearTimeout(closing.current);
    if (!canOpen()) return;
    setSide(
      referenceOverride ? placement : sideFor(refs.reference.current as Element | null, placement),
    );
    setOpen(true);
  }, [canOpen, placement, refs, referenceOverride]);
  const showSoon = useCallback(() => {
    clearTimeout(closing.current);
    clearTimeout(opening.current);
    opening.current = setTimeout(show, openDelayMs);
  }, [show, openDelayMs]);
  const hide = useCallback(() => {
    clearTimeout(opening.current);
    clearTimeout(closing.current);
    pinned.current = false;
    setOpen(false);
  }, []);
  const hideSoon = useCallback(() => {
    clearTimeout(opening.current);
    clearTimeout(closing.current);
    if (pinned.current) return;
    const close = () => {
      // A pinnable tip stays while focus is inside it.
      if (pinnable && anchorNode.current?.matches(':focus-within')) return;
      setOpen(false);
    };
    if (closeDelayMs <= 0) close();
    else closing.current = setTimeout(close, closeDelayMs);
  }, [closeDelayMs, pinnable]);
  const toggle = useCallback(() => {
    if (pinned.current) hide();
    else {
      pinned.current = true;
      show();
    }
  }, [hide, show]);
  const { setReference } = refs;
  const anchor = useCallback(
    (node: HTMLElement | null) => {
      anchorNode.current = node;
      setReference(node);
    },
    [setReference],
  );
  const unpin = useCallback(() => {
    pinned.current = false;
  }, []);

  // On the document, as a tip opened by hover has no focus to listen from. Marked handled, so the Escape
  // that closes a tip closes nothing else, such as a modal's `<dialog>` or a changed form's discard
  // (as Combobox/escape.ts does); with the tip shut, Escape is left alone.
  useDismiss({
    active: open,
    onEscape: (event) => {
      event.preventDefault();
      hide();
      onEscape?.();
    },
  });

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
    toggle,
    unpin,
    anchor,
    bubble: refs.setFloating,
    // The bubble's own `right` and `bottom` are cleared so a stylesheet that
    // still sets them cannot stretch it between top and bottom.
    bubbleStyle: { ...floatingStyles, right: 'auto', bottom: 'auto' },
  };
}
