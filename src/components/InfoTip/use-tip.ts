'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tip } from './types';

// A tip's open state as WCAG 1.4.13 asks it to behave: shown on hover, focus
// or a tap, kept open while the pointer is over it, and closed on Escape,
// blur, or the pointer leaving. InfoTip's, and every other tip's beside a
// control: UserList's, IconTip's beside every Edit pencil, and Combobox's entry
// and qualifier tooltips
// (claude-docs/components/info-tip.md, "Behaviour").

// Long enough to cross from the control onto the tip.
const CLOSE_DELAY_MS = 150;

// The default `canOpen`, at module level so `show` keeps one identity for a
// caller that passes none; a default written in the signature would be a new
// function every render.
const ALWAYS = () => true;

/**
 * Whether the tip is open, and its three handlers. `canOpen` is asked as it
 * opens rather than watched: whether a Combobox entry's text fits changes with
 * the control's width, and only matters at the moment someone looks.
 */
export function useTip(canOpen: () => boolean = ALWAYS): Tip {
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    clearTimeout(closing.current);
    if (canOpen()) setOpen(true);
  }, [canOpen]);
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

  useEffect(() => () => clearTimeout(closing.current), []);

  return { open, show, hide, hideSoon };
}
