'use client';

import { type ReactElement, useContext, useEffect, useRef, useState } from 'react';
import { useLeaveGuard } from '@/lib/navigation';
import { CloseGuardContext } from './close-guard';
import { ConfirmOverlay } from './confirm-overlay';
import type { DiscardGuard, DiscardQuestionProps } from './types';
import './index.scss';

// A form's unsaved changes, kept from every way out of its modal: Cancel, the
// Close button, Escape and a click outside each ask "Discard them?" first
// while the form has changes, the owner's call during MB.115. One guard for
// every admin form rather than a copy in each; the form says whether it has
// changes and where Cancel goes, and draws the question over itself, as its
// Delete question is (claude-docs/components/modal.md, "Unsaved changes").
// Saving and deleting close through the modal's own close, which nothing
// guards. Leaving the page is guarded too, through useLeaveGuard (M13.14):
// closing the tab or reloading asks the browser's question, and on a page an
// in-app navigation asks this one. In a modal navigations go unheld: the page
// behind is inert, and what navigates from there is the form itself, after a
// save, or the modal's close after Discard Changes, while the form still reads
// as changed.

/**
 * Guards a form's way out while `dirty`, its own `formState.isDirty`, the
 * flag that enables its Save. Inside a `Modal` it also guards the modal's
 * Close button, Escape and backdrop; outside one, an in-app navigation. A
 * tab close or reload asks the browser's question either way.
 */
export function useDiscardGuard(dirty: boolean): DiscardGuard {
  const slot = useContext(CloseGuardContext);
  const [asking, setAsking] = useState(false);
  // How many times a way out was tried again while asking: each flashes the
  // question, so the person sees why nothing closed (MB.115, the owner's call).
  const [flashes, setFlashes] = useState(0);
  // The close the question holds back, made by Discard Changes.
  const held = useRef<(() => void) | null>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);

  /** True when nothing would be lost; otherwise asks, holding `close` back. */
  const consult = (close: () => void): boolean => {
    if (!dirty) return true;
    held.current = close;
    // Tried again while asking: it is already asking, so it flashes.
    if (asking) setFlashes((count) => count + 1);
    else setAsking(true);
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

  const request = (close: () => void) => {
    if (consult(close)) close();
  };
  useLeaveGuard(dirty, request, { holdNavigation: slot === null });

  return {
    asking,
    request,
    discard: () => held.current?.(),
    flashes,
    keepEditing: () => {
      setAsking(false);
      setFlashes(0);
    },
    keepEditingRef,
  };
}

/**
 * The question, drawn by the form while `guard.asking`, over it in a modal
 * (`ConfirmOverlay`). Its focus is the overlay's: on Keep Editing as it
 * comes and on each flash, and back where it was as it goes.
 */
export function DiscardQuestion({ guard }: DiscardQuestionProps): ReactElement {
  const { discard, keepEditing, keepEditingRef, flashes } = guard;
  return (
    <ConfirmOverlay
      question="You have unsaved changes. Discard them?"
      safe={keepEditingRef}
      flashes={flashes}
    >
      {/* Said again on each try, for a screen reader: the focus may already
          be on Keep Editing, and moving it there again says nothing. A live
          region speaks only a change, so a trailing no-break space alternates. */}
      <output className="visually-hidden">
        {flashes > 0 && `You have unsaved changes.${flashes % 2 ? '' : '\u00a0'}`}
      </output>
      <div className="modal__actions">
        <button type="button" className="btn btn--destructive" onClick={discard}>
          Discard Changes
        </button>
        <button ref={keepEditingRef} type="button" className="btn btn--quiet" onClick={keepEditing}>
          Keep Editing
        </button>
      </div>
    </ConfirmOverlay>
  );
}
