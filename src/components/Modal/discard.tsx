'use client';

import { type ReactElement, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLeaveGuard } from '@/lib/navigation';
import { CloseGuardContext } from './close-guard';
import { ConfirmOverlay } from './confirm-overlay';
import Modal from './modal';
import type { DiscardGuard, DiscardQuestionProps } from './types';
import './index.scss';

// A form's unsaved changes, kept from every way out of its modal: Cancel, Close, Escape and a click
// outside ask "Discard them?" while the form has changes. It also guards leaving the page
// (claude-docs/components/modal.md, "Unsaved changes").

/**
 * Guards a form's way out while `dirty` (its `formState.isDirty`): inside a `Modal` the Close
 * button, Escape and backdrop, outside one an in-app navigation; a tab close or reload asks the
 * browser's question either way.
 */
export function useDiscardGuard(dirty: boolean): DiscardGuard {
  const slot = useContext(CloseGuardContext);
  const [asking, setAsking] = useState(false);
  // How many times a way out was tried again while asking; each flashes the question.
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
 * The question, drawn by the form while `guard.asking`: over it in a modal
 * (`ConfirmOverlay`), or on a page as a dialog of its own. Its focus is on
 * Keep Editing as it comes, and back where it was as it goes.
 */
export function DiscardQuestion({ guard }: DiscardQuestionProps): ReactElement {
  const inModal = useContext(CloseGuardContext) !== null;
  return inModal ? <InModal guard={guard} /> : <OnPage guard={guard} />;
}

/**
 * The question as a dialog, for a form on a page: Escape, Close and a click outside are Keep
 * Editing. Nothing flashes, since the page behind is inert while it is open.
 */
function OnPage({ guard }: DiscardQuestionProps): ReactElement {
  const { discard, keepEditing, keepEditingRef } = guard;
  // On Keep Editing, the safe answer, once the dialog is open: this effect
  // runs before the modal's own, which opens it and then, in a microtask
  // queued after this one, leaves a focus already in its body where it is.
  useEffect(() => {
    queueMicrotask(() => keepEditingRef.current?.focus());
  }, [keepEditingRef]);
  // Into the body, out of the form it would otherwise sit in: the dialog is
  // not part of the form, and a button in it must not be one of the form's.
  return createPortal(
    <Modal title="Discard Changes?" onClose={keepEditing}>
      {(close) => (
        <>
          <p>You have unsaved changes. Discard them?</p>
          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--destructive"
              onClick={() => {
                discard();
                close();
              }}
            >
              Discard Changes
            </button>
            <button ref={keepEditingRef} type="button" className="btn btn--quiet" onClick={close}>
              Keep Editing
            </button>
          </div>
        </>
      )}
    </Modal>,
    document.body,
  );
}

/** The question over the form, in its modal's layer, flashing on each way out tried again. */
function InModal({ guard }: DiscardQuestionProps): ReactElement {
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
