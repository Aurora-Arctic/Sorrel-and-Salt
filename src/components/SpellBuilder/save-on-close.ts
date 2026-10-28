'use client';

import { useContext, useEffect, useRef } from 'react';
import { CloseGuardContext } from '../Modal/close-guard';

// The spell builder's way out of its modal (M10.12): Close, Escape and a click
// outside save what is unsaved, then close, and ask nothing. The owner's call
// on 2026-10-27, an exception to M13.14's Discard question for this form
// alone, since a spell's draft is kept rather than thrown away
// (claude-docs/design-decisions/m10.12-spell-builder-modal.md). The close is
// held while the save runs: a refused save keeps the modal open with the
// refusal shown, so nothing typed is lost. Closing the tab or reloading is
// the autosave's to guard (`useAutosave` asks the browser, and saves as the
// tab hides), which no page can answer by saving.

/**
 * Puts the save-on-close guard in the modal's slot. `unsaved` is whether
 * anything is not yet on the server, and `save` flushes it, answering whether
 * the server has it. The modal closes when it does, and stays open when not.
 */
export function useSaveOnClose(unsaved: boolean, save: () => Promise<boolean>): void {
  const slot = useContext(CloseGuardContext);

  /** True when nothing is unsaved; otherwise holds `close` until the save lands. */
  const consult = (close: () => void): boolean => {
    if (!unsaved) return true;
    void save().then((saved) => {
      if (saved) close();
    });
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
}
