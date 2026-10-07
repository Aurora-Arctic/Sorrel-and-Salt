'use client';

import { type ReactElement, type SyntheticEvent, useEffect, useId, useRef } from 'react';
import type { ModalProps } from './types';
import './index.scss';

// A dialog over the page on the native element's modal mode: `showModal()`
// puts it in the top layer and makes the rest of the page inert, which is the
// focus trap, and turns Escape into a `cancel` event — none of it hand-built.
// The owner decides when it closes, by unmounting it, so the address of a
// URL-driven modal never says open while it is shut
// (claude-docs/components/modal.md).

const Modal = ({ title, onClose, children }: ModalProps): ReactElement => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Guarded: Strict Mode runs the effect twice, and an open dialog refuses a second showModal().
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  }, []);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>): void => {
    event.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="modal modal-dialog"
      aria-labelledby={titleId}
      onCancel={handleCancel}
    >
      <div className="modal-dialog__header">
        <h2 id={titleId} className="modal-dialog__title">
          {title}
        </h2>
        <button type="button" className="modal-dialog__close" aria-label="Close" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {children}
    </dialog>
  );
};

export default Modal;
