'use client';

import {
  type MouseEvent,
  type ReactElement,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CloseGuardContext, closeGuardSlot } from './close-guard';
import { ConfirmLayerContext } from './confirm-layer';
import { firstShownField } from './fields';
import { HeaderSlotContext } from './header-slot';
import type { ConfirmLayer, ModalPhase, ModalProps } from './types';
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

/** Motion turned down, or no way to ask, so a close is not held for a fade. */
const fadesAreOff = (): boolean =>
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Whether the point is outside the dialog's box: on the backdrop, which is the dialog's own to an event. */
function isOutside(dialog: HTMLDialogElement, { clientX, clientY }: MouseEvent): boolean {
  const box = dialog.getBoundingClientRect();
  return clientX < box.left || clientX > box.right || clientY < box.top || clientY > box.bottom;
}

const Modal = ({
  title,
  eyebrow,
  destination,
  qualifier,
  onClose,
  size,
  loading = false,
  children,
}: ModalProps): ReactElement => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const eyebrowId = useId();
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Guarded: Strict Mode runs the effect twice, and an open dialog refuses a second showModal().
    if (!dialog.open) {
      dialog.showModal();
      // showModal() puts the focus on the first thing that takes it, which is
      // Close, in the header; the person opened the dialog to fill it in, so
      // it goes to the body's first field, or with none to the dialog itself,
      // whose name is read and from which Tab reaches Close. Here, after
      // showModal(), since React's autoFocus runs before it and is overridden.
      (firstShownField(body.current ?? dialog) ?? dialog).focus();
    }
    return () => dialog.close();
  }, []);

  // Contents that arrive after it opened (M9.18), a route modal's form in
  // place of its skeleton, take the focus as contents there from the start
  // do: their first field, if the focus is still on the dialog itself and
  // not on Close, where a person may have tabbed while it loaded.
  const wasLoading = useRef(loading);
  useEffect(() => {
    const dialog = ref.current;
    if (wasLoading.current && !loading && dialog && document.activeElement === dialog) {
      firstShownField(body.current ?? dialog)?.focus();
    }
    wasLoading.current = loading;
  }, [loading]);

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

  // The Close button, Escape and a click outside ask the contents' guard
  // first: a form with unsaved changes asks before it goes, and closes the
  // modal itself if the answer is to (claude-docs/components/modal.md,
  // "Unsaved changes"). The close handed to the contents is not guarded, so
  // a save or a delete goes at once. Nothing is asked once it is closing.
  const [guard] = useState(closeGuardSlot);
  // Held in state, so the contents redraw into it once it is in the page.
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);

  // A question a form asks over itself (ConfirmOverlay, MB.115) is drawn in
  // the layer over the body, and holds the body and the control beside the
  // title inert while it shows; the title and the Close button stay live, so
  // a way out tried meanwhile still reaches the guard. The attribute is set
  // on the elements rather than through a render, so it is on before the
  // question takes the focus and off before the focus goes back.
  const [layerHost, setLayerHost] = useState<HTMLElement | null>(null);
  const holds = useRef(0);
  const slotRef = useRef<HTMLElement | null>(null);
  const putHeaderSlot = useCallback((element: HTMLElement | null): void => {
    slotRef.current = element;
    setHeaderSlot(element);
  }, []);
  const hold = useCallback((): (() => void) => {
    const held = (on: boolean): void => {
      body.current?.toggleAttribute('inert', on);
      slotRef.current?.toggleAttribute('inert', on);
    };
    holds.current += 1;
    held(true);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      holds.current -= 1;
      if (holds.current === 0) held(false);
    };
  }, []);
  const layer = useMemo<ConfirmLayer>(() => ({ host: layerHost, hold, body }), [layerHost, hold]);
  const request = (): void => {
    if (phase === 'open' && guard.consult(close)) close();
  };

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>): void => {
    event.preventDefault();
    request();
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
    if (outside && pressedOutside.current) request();
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
      // Focusable by script alone, for a dialog with no field to take the focus.
      tabIndex={-1}
      // Named by the eyebrow and the heading together, "Edit Ingredient,
      // Mugwort", or by the heading then where it lands, "Add Ingredient to
      // Whitethorn Coven".
      aria-labelledby={
        eyebrow ? `${eyebrowId} ${titleId}` : destination ? `${titleId} ${eyebrowId}` : titleId
      }
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      // The dialog's own fade, or its backdrop's, which reports here too.
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget) finish();
      }}
    >
      <div className="modal-dialog__header">
        {/* An edit dialog's head (MB.115): what it does to what kind, then
            which entry. The hidden commas are for the dialog's name alone,
            which a screen reader would otherwise run together. */}
        <div className="header modal-dialog__heading">
          {eyebrow && (
            <p id={eyebrowId} className="eyebrow">
              {eyebrow}
              <span className="spoken-separator">,</span>
            </p>
          )}
          {destination && !eyebrow && (
            <p id={eyebrowId} className="eyebrow">
              <span className="spoken-separator">to</span> {destination}
            </p>
          )}
          <h2 id={titleId} className="modal-dialog__title">
            {title}
            {qualifier && (
              <>
                <span className="spoken-separator">,</span>{' '}
                <span className="modal-dialog__qualifier">{qualifier}</span>
              </>
            )}
          </h2>
        </div>
        <button type="button" className="modal-dialog__close" aria-label="Close" onClick={request}>
          <span aria-hidden="true">×</span>
        </button>
        {/* Under the heading, for a control the contents put there
            (HeaderSlotContext): after the × in Tab order, as on screen. */}
        <div ref={putHeaderSlot} className="modal-dialog__header-slot" />
      </div>
      {/* The body scrolls beneath the header, rather than the whole dialog,
          so a question's layer can lie over exactly the part in view. */}
      <div className="modal-dialog__main">
        <div ref={body} className="modal-dialog__body" aria-busy={loading || undefined}>
          <CloseGuardContext.Provider value={guard}>
            <HeaderSlotContext.Provider value={headerSlot}>
              <ConfirmLayerContext.Provider value={layer}>
                {typeof children === 'function' ? children(close) : children}
              </ConfirmLayerContext.Provider>
            </HeaderSlotContext.Provider>
          </CloseGuardContext.Provider>
        </div>
        <div ref={setLayerHost} className="modal-dialog__layer" />
      </div>
    </dialog>
  );
  // oxlint-enable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
};

export default Modal;
