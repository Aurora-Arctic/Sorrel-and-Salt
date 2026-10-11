'use client';

import {
  type MouseEvent,
  type ReactElement,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { ModalPhase, ModalProps } from './types';
import './index.scss';

// A dialog over the page on the native element's modal mode: `showModal()`
// puts it in the top layer and makes the rest of the page inert, which is the
// focus trap, and turns Escape into a `cancel` event — none of it hand-built.
// The owner decides when it closes, by unmounting it, so the address of a
// URL-driven modal never says open while it is shut
// (claude-docs/components/modal.md).

/**
 * How long the fade out may take before the owner is asked to close it anyway:
 * past the transition's own length (index.scss), for a browser that never
 * reports its end.
 */
const FADE_LIMIT_MS = 400;

/** Motion turned down, or no way to ask — jsdom — so a close is not held for a fade. */
const fadesAreOff = (): boolean =>
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Whether the point is outside the dialog's box: on the backdrop, which is the dialog's own to an event. */
function isOutside(dialog: HTMLDialogElement, { clientX, clientY }: MouseEvent): boolean {
  const box = dialog.getBoundingClientRect();
  return clientX < box.left || clientX > box.right || clientY < box.top || clientY > box.bottom;
}

const Modal = ({ title, onClose, size, children }: ModalProps): ReactElement => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Guarded: Strict Mode runs the effect twice, and an open dialog refuses a second showModal().
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  }, []);

  // It fades out before the owner is asked to close it, the owner's call
  // during M5.5: the owner's unmount would take it away at once. Asked once,
  // however many ways — the end of the fade, or the limit if that never comes.
  // Open, fading, then closed: closed asks the owner, once, in an effect, so
  // nothing a render reaches reads a ref (the close is handed to the contents).
  const [phase, setPhase] = useState<ModalPhase>('open');
  // With no fade to wait on the owner is asked at once, in the event, as it
  // was before the fade: `asked` marks it, so the effect below asks no more.
  const close = (): void => {
    if (phase !== 'open') return;
    if (!fadesAreOff()) return setPhase('fading');
    setPhase('asked');
    onClose();
  };
  const finish = useCallback((): void => {
    setPhase((now) => (now === 'fading' ? 'closed' : now));
  }, []);
  const closing = phase !== 'open';
  // The latest `onClose`, called when the fade ends rather than when it began.
  const owner = useRef(onClose);
  useEffect(() => {
    owner.current = onClose;
  });
  useEffect(() => {
    if (phase === 'closed') owner.current();
    if (phase !== 'fading') return;
    const limit = setTimeout(finish, FADE_LIMIT_MS);
    return () => clearTimeout(limit);
  }, [phase, finish]);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>): void => {
    event.preventDefault();
    close();
  };

  // A click outside asks the owner to close it, as Escape does, the owner's
  // call during M5.5 — but only a press that began there too, so a selection
  // dragged out of a field and let go over the backdrop keeps the form.
  const pressedOutside = useRef(false);
  const handleMouseDown = (event: MouseEvent<HTMLDialogElement>): void => {
    pressedOutside.current =
      event.target === event.currentTarget && isOutside(event.currentTarget, event);
  };
  const handleClick = (event: MouseEvent<HTMLDialogElement>): void => {
    const outside = event.target === event.currentTarget && isOutside(event.currentTarget, event);
    if (outside && pressedOutside.current) close();
    pressedOutside.current = false;
  };

  // The backdrop's click is the pointer's alone; Escape is its keyboard
  // equivalent, handled above.
  // oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
  return (
    <dialog
      ref={ref}
      className={['modal modal-dialog', size && `modal-dialog--${size}`, closing && 'is-closing']
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      // The dialog's own fade, or its backdrop's, which reports here too.
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget) finish();
      }}
    >
      <div className="modal-dialog__header">
        <h2 id={titleId} className="modal-dialog__title">
          {title}
        </h2>
        <button type="button" className="modal-dialog__close" aria-label="Close" onClick={close}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {typeof children === 'function' ? children(close) : children}
    </dialog>
  );
  // oxlint-enable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
};

export default Modal;
