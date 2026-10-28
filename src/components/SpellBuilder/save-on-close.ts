'use client';

import { useContext, useEffect, useRef } from 'react';
import { useLeaveGuard } from '@/lib/navigation';
import { CloseGuardContext } from '../Modal/close-guard';
import type { SaveOnClose } from './types';

// The spell builder's way out of its modal (M10.12): Close, Escape and a click
// outside save what is unsaved, then close, and ask nothing. The owner's call
// on 2026-10-27, an exception to M13.14's Discard question for this form
// alone, since a spell's draft is kept rather than thrown away
// (claude-docs/design-decisions/m10.12-spell-builder-modal.md). The close is
// held while the save runs: a refused save keeps the modal open with the
// refusal shown, so nothing typed is lost. Closing the tab or reloading still
// asks the browser's question, which no page can answer by saving.

/**
 * Puts the save-on-close guard in the modal's slot. `dirty` is whether a field
 * reads differently from the last save, `saving` whether a save is on its way,
 * and `submit` starts one. The form reports each save's end through the
 * answer's `saved` or `refused`.
 */
export function useSaveOnClose(dirty: boolean, saving: boolean, submit: () => void): SaveOnClose {
  const slot = useContext(CloseGuardContext);
  // The close a save holds back, run once that save lands.
  const closing = useRef<(() => void) | null>(null);

  /** True when nothing is unsaved; otherwise holds `close` until a save lands. */
  const consult = (close: () => void): boolean => {
    if (!dirty && !saving) return true;
    closing.current = close;
    // A save already on its way closes the modal when it lands.
    if (!saving) submit();
    return false;
  };

  // The modal reads the guard when it is asked to close, which is after this
  // render: the latest one's, through a ref, so the slot is filled once.
  const latest = useRef(consult);
  useEffect(() => {
    latest.current = consult;
  });
  useEffect(() => {
    if (!slot) return;
    return slot.put((close) => latest.current(close));
  }, [slot]);

  // In a modal an in-app navigation goes unheld: the page behind is inert, and
  // what navigates is the builder's own close after its save.
  useLeaveGuard(dirty, (go) => go(), { holdNavigation: false });

  return {
    saved: () => {
      const close = closing.current;
      closing.current = null;
      close?.();
      return close !== null;
    },
    refused: () => {
      closing.current = null;
    },
  };
}
