'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tip } from './types';

// A tip's open state as WCAG 1.4.13 asks it to behave: shown on hover, focus
// or a tap, kept open while the pointer is over it, and closed on Escape,
// blur, or the pointer leaving. InfoTip's, and every other tip's beside a
// control (claude-docs/components/info-tip.md, "Behaviour").

// Long enough to cross from the control onto the tip.
const CLOSE_DELAY_MS = 150;

export function useTip(): Tip {
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    clearTimeout(closing.current);
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    clearTimeout(closing.current);
    setOpen(false);
  }, []);
  const hideSoon = useCallback(() => {
    clearTimeout(closing.current);
    closing.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!open) return;
    // On the document: a tip opened by hover has no focus to listen from.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, hide]);

  useEffect(() => () => clearTimeout(closing.current), []);

  return { open, show, hide, hideSoon };
}
