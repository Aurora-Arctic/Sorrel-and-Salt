'use client';

import { type ReactElement, useContext, useEffect, useId, useRef, useState } from 'react';
import { CloseGuardContext } from './close-guard';
import type { DiscardGuard, DiscardQuestionProps } from './types';
import './index.scss';

// A form's unsaved changes, kept from every way out of its modal: Cancel, the
// Close button, Escape and a click outside each ask "Discard them?" first
// while the form has changes, the owner's call during MB.115. One guard for
// every admin form rather than a copy in each; the form says whether it has
// changes and where Cancel goes, and draws the question where its buttons
// were, as its Delete question is (claude-docs/components/modal.md,
// "Unsaved changes"). Saving and deleting close through the modal's own
// close, which nothing guards.

/** A field to go back to when the one last focused has gone: the form's first. */
const FIRST_FIELD =
  'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled)';

/**
 * Guards a form's way out while `dirty`, its own `formState.isDirty`, the
 * flag that enables its Save. Inside a `Modal` it also guards the modal's
 * Close button, Escape and backdrop.
 */
export function useDiscardGuard(dirty: boolean): DiscardGuard {
  const slot = useContext(CloseGuardContext);
  const [asking, setAsking] = useState(false);
  // How many times a way out was tried again while asking: each flashes the
  // question, so the person sees why nothing closed (MB.115, the owner's call).
  const [flashes, setFlashes] = useState(0);
  // The close the question holds back, made by Discard Changes.
  const held = useRef<(() => void) | null>(null);
  // Where the focus was when the question came, for Keep Editing to go back to.
  const returnTo = useRef<Element | null>(null);
  const form = useRef<HTMLFormElement | null>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);

  /** True when nothing would be lost; otherwise asks, holding `close` back. */
  const consult = (close: () => void): boolean => {
    if (!dirty) return true;
    held.current = close;
    // Tried again while asking: it is already asking, so it flashes.
    if (asking) setFlashes((count) => count + 1);
    else {
      returnTo.current = document.activeElement;
      setAsking(true);
    }
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

  // The question is brought into view and takes the focus on its safe
  // answer, Keep Editing, as the forms' Delete questions do (MB.115): the
  // button pressed has gone, and in a long form the question would sit below
  // the fold. Again on each flash, wherever the focus had gone meanwhile.
  // Smooth unless motion is reduced; jsdom has no scrollIntoView, hence the
  // optional call. Put away, the focus goes back where it was, or to the
  // form's first field if that has gone, as Cancel has.
  useEffect(() => {
    if (asking) {
      const button = keepEditingRef.current;
      if (!button) return;
      form.current = button.closest('form');
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
      button.closest('.form__confirm')?.scrollIntoView?.({
        block: 'end',
        behavior: still ? 'auto' : 'smooth',
      });
      button.focus({ preventScroll: true });
      return;
    }
    const back = returnTo.current;
    if (!back) return;
    returnTo.current = null;
    if (back instanceof HTMLElement && back.isConnected && back !== document.body) back.focus();
    else form.current?.querySelector<HTMLElement>(FIRST_FIELD)?.focus();
  }, [asking, flashes]);

  return {
    asking,
    request: (close) => {
      if (consult(close)) close();
    },
    discard: () => held.current?.(),
    flashes,
    keepEditing: () => {
      setAsking(false);
      setFlashes(0);
    },
    keepEditingRef,
  };
}

/** The question, drawn by the form in place of its actions while `guard.asking`. */
export function DiscardQuestion({
  guard,
  row = 'modal__actions',
}: DiscardQuestionProps): ReactElement {
  const { discard, keepEditing, keepEditingRef, flashes } = guard;
  const id = useId();
  return (
    <div className="form__confirm discard-question" data-flash={flashes}>
      {/* The flash, a fresh element per try so its animation runs each time. */}
      {flashes > 0 && <span key={flashes} className="discard-question__flash" aria-hidden />}
      <p id={id}>You have unsaved changes. Discard them?</p>
      {/* Said again on each try, for a screen reader: the focus may already
          be on Keep Editing, and moving it there again says nothing. A live
          region speaks only a change, so a trailing no-break space alternates. */}
      <output className="visually-hidden">
        {flashes > 0 && `You have unsaved changes.${flashes % 2 ? '' : '\u00a0'}`}
      </output>
      <div className={row}>
        <button type="button" className="btn btn--destructive" onClick={discard}>
          Discard Changes
        </button>
        {/* Described by the question, so the focus it takes reads it. */}
        <button
          ref={keepEditingRef}
          type="button"
          className="btn btn--quiet"
          aria-describedby={id}
          onClick={keepEditing}
        >
          Keep Editing
        </button>
      </div>
    </div>
  );
}
