'use client';

import { useContext, useEffect, useRef } from 'react';
import { CloseGuardContext } from '../Modal/close-guard';

// The modal's way out: Close, Escape and an outside click save what is unsaved, then close, with no Discard question; a refused save keeps it open
// (claude-docs/components/spell-builder.md, "Notes from code comments: closing the modal").

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
