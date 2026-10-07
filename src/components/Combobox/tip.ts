'use client';

import { useEffect, useRef, useState } from 'react';

// A tooltip's open state, which an entry's and the qualifier's share: open on
// hover or focus while there is something to show, closed at once on blur and
// on Escape (WCAG 1.4.13), and a moment after the pointer leaves.

// Long enough for the pointer to cross from what it rests on onto the
// tooltip, whose hover keeps it open, as InfoTip's does.
const TIP_CLOSE_DELAY_MS = 150;

/**
 * Whether the tooltip is open, and its three handlers. `canOpen` is asked as
 * it opens rather than watched: whether an entry's text fits changes with the
 * control's width, and only matters at the moment someone looks.
 */
export function useTip(canOpen: () => boolean) {
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = () => {
    clearTimeout(closing.current);
    if (canOpen()) setOpen(true);
  };
  const hide = () => {
    clearTimeout(closing.current);
    setOpen(false);
  };
  const hideSoon = () => {
    clearTimeout(closing.current);
    closing.current = setTimeout(() => setOpen(false), TIP_CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearTimeout(closing.current), []);

  useEffect(() => {
    if (!open) return;
    // On the document: a tooltip opened by hover has no focus to listen from.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return { open, show, hide, hideSoon };
}
