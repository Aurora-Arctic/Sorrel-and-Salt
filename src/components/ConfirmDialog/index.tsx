'use client';

import { type ReactElement, type ReactNode, useEffect, useId, useRef } from 'react';
import BusyButton from '../BusyButton';
import { giveFocusBack } from '../Modal/modal';
import { holdPage } from '../Modal/page-hold';
import '../Modal/index.scss';
import './index.scss';

// A yes-or-no question in a modal of its own, for a confirm with no form to ask over (claude-docs/
// components/confirm-dialog.md). An alert dialog: Escape and Cancel are the safe answer, and the focus
// lands on it, never on the confirm. The owner unmounts it, so the focus goes back to what opened it here.

export interface ConfirmDialogProps {
  /** The dialog's name: "Delete Spell". */
  title: string;
  /** The question, the thing it names in bold. */
  question: ReactNode;
  /** The confirm's text, the verb: "Delete". */
  confirmLabel: string;
  /** The confirm's text while the write runs: "Deleting". */
  busyLabel: string;
  /** The write is running: the confirm is busy and Cancel is held. */
  busy?: boolean;
  /** The confirm's button style; `destructive` unless the answer can be taken back. */
  tone?: 'destructive' | 'solid';
  /** Under the question: a warning or a refusal. */
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  /** Where the focus goes once it closes, if its opener is gone. */
  returnTo?: () => HTMLElement | null | undefined;
}

const ConfirmDialog = ({
  title,
  question,
  confirmLabel,
  busyLabel,
  busy = false,
  tone = 'destructive',
  children,
  onConfirm,
  onClose,
  returnTo,
}: ConfirmDialogProps): ReactElement => {
  const ref = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const questionId = useId();
  const fallback = useRef(returnTo);
  useEffect(() => {
    fallback.current = returnTo;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const active = document.activeElement;
    const opener = active === document.body ? null : active;
    let cancelled = false;
    let release: (() => void) | undefined;
    if (!dialog.open) {
      release = holdPage();
      dialog.showModal();
      // After showModal(), which moves the focus itself, and in a microtask the cleanup can cancel.
      queueMicrotask(() => {
        if (!cancelled) cancel.current?.focus();
      });
    }
    return () => {
      cancelled = true;
      dialog.close();
      release?.();
      // Strict Mode's rehearsal leaves the dialog in the page; only a real unmount gives the focus back.
      if (dialog.isConnected) return;
      giveFocusBack(opener, fallback.current);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal modal-dialog confirm-dialog"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={questionId}
      // Escape is the safe answer: nothing is confirmed, and the owner closes it.
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id={titleId} className="confirm-dialog__title">
        {title}
      </h2>
      <p id={questionId} className="confirm-dialog__question">
        {question}
      </p>
      {children}
      <div className="modal__actions">
        <BusyButton
          className={`btn btn--${tone}`}
          busy={busy}
          busyLabel={busyLabel}
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </BusyButton>
        <button
          ref={cancel}
          type="button"
          className="btn btn--quiet"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;
