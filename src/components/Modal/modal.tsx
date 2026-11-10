'use client';

import { FADE_LIMIT_MS, prefersReducedMotion } from '@/lib/motion';
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
import { pageHeading } from './page-heading';
import { holdPage } from './page-hold';
import { HeaderNoteContext, HeaderSlotContext } from './header-slot';
import type { ConfirmLayer, ModalPhase, ModalProps } from './types';
import './index.scss';
import { cx } from '@/lib/class-names';

// A dialog on the native element's modal mode: `showModal()` gives the top layer, the inert page
// (the focus trap) and the `cancel` event for Escape. The owner closes it by unmounting it, so a
// URL-driven modal's address never says open while it is shut (claude-docs/components/modal.md).

/**
 * How soon after one modal goes, open and not faded out, another that opens takes its place:
 * a link in the first one's foot unmounts one and mounts the other in one commit.
 */
const HANDOVER_MS = 100;

let handedAt = Number.NEGATIVE_INFINITY;

/** By point, not target: a click on the backdrop reports the dialog itself as its target. */
function isOutside(dialog: HTMLDialogElement, { clientX, clientY }: MouseEvent): boolean {
  const box = dialog.getBoundingClientRect();
  return clientX < box.left || clientX > box.right || clientY < box.top || clientY > box.bottom;
}

/**
 * Back to what opened the modal if it is still in the page and not hidden, else where the owner
 * says, else the page's heading; only if nothing took the focus meanwhile (a page a save opens
 * may). The dialog is already out of the page, so a focus that was in it is on the body.
 */
export function giveFocusBack(opener: Element | null, returnTo: ModalProps['returnTo']): void {
  const now = document.activeElement;
  if (now && now !== document.body) return;
  const target =
    opener instanceof HTMLElement && opener.isConnected && !opener.closest('[hidden], [inert]')
      ? opener
      : (returnTo?.(opener) ?? pageHeading());
  if (!target) return;
  // One already in the window is focused where it is: a plain focus() would scroll to a link in the sticky bar,
  // which the root's `scroll-padding-top` counts as hidden under the bar.
  const { top, bottom, left, right } = target.getBoundingClientRect();
  const inWindow = bottom > 0 && top < window.innerHeight && right > 0 && left < window.innerWidth;
  target.focus(inWindow ? { preventScroll: true } : undefined);
}

const Modal = ({
  title,
  eyebrow,
  destination,
  qualifier,
  formalName,
  topEnd,
  formalActions,
  actionsUnderClose,
  under,
  focusTitle = false,
  headerAlign = 'start',
  aboveName,
  onClose,
  returnTo,
  size,
  readingBody = false,
  loading = false,
  foot,
  children,
}: ModalProps): ReactElement => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const eyebrowId = useId();
  const body = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  // What held the focus as it opened, taken before showModal() moves it, for the focus to go back
  // to as it closes (APG, "Dialog (Modal)"). Modal does it, not each owner, because the owner
  // unmounts the dialog, so the browser's own return never runs.
  const opener = useRef<Element | null>(null);
  const taken = useRef(false);
  const fallback = useRef(returnTo);
  useEffect(() => {
    fallback.current = returnTo;
  });

  // Set by `close` for the open effect's cleanup: a modal unmounted while still open was replaced
  // or left behind by a navigation. A ref set in the event, not a mirror of `phase`: under reduced
  // motion the owner unmounts it in the same render, before an effect could copy the phase across.
  const shutting = useRef(false);
  const focusTitleRef = useRef(focusTitle);
  focusTitleRef.current = focusTitle;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let cancelled = false;
    let release: (() => void) | undefined;
    // Guarded: Strict Mode runs the effect twice, and an open dialog refuses a second showModal().
    if (!dialog.open) {
      if (!taken.current) {
        taken.current = true;
        const active = document.activeElement;
        opener.current = active === document.body ? null : active;
      }
      // Measured before showModal(), while the scrollbar it is to replace is still there.
      release = holdPage();
      if (performance.now() - handedAt < HANDOVER_MS) dialog.dataset.handover = '';
      dialog.showModal();
      // The focus goes to the body's first field, or the dialog itself with none, not to Close.
      // After showModal() since autoFocus runs before it, and in a microtask the cleanup can cancel
      // (claude-docs/components/modal.md, "The first field's focus"). Contents that take it keep it.
      queueMicrotask(() => {
        if (cancelled || body.current?.contains(document.activeElement)) return;
        const title = focusTitleRef.current
          ? dialog.querySelector<HTMLElement>('.modal-dialog__title')
          : null;
        (title ?? firstShownField(body.current ?? dialog) ?? dialog).focus();
      });
    }
    return () => {
      cancelled = true;
      dialog.close();
      release?.();
      // Strict Mode's rehearsal leaves the dialog in the page; only a real
      // unmount takes it out, and only that gives the focus back.
      if (dialog.isConnected) return;
      if (!shutting.current) handedAt = performance.now();
      giveFocusBack(opener.current, fallback.current);
    };
  }, []);

  // Contents that arrive after it opened (a route modal's form in place of its skeleton) take the
  // focus on their first field, if it is still on the dialog itself and not on Close.
  const wasLoading = useRef(loading);
  useEffect(() => {
    const dialog = ref.current;
    if (wasLoading.current && !loading && dialog && document.activeElement === dialog) {
      const title = focusTitle ? dialog.querySelector<HTMLElement>('.modal-dialog__title') : null;
      (title ?? firstShownField(body.current ?? dialog))?.focus();
    }
    wasLoading.current = loading;
  }, [loading, focusTitle]);
  // A view the contents switch to whose heading is the title takes the focus there as it turns on.
  const wasTitled = useRef(focusTitle);
  useEffect(() => {
    if (focusTitle && !wasTitled.current && ref.current?.open) {
      ref.current.querySelector<HTMLElement>('.modal-dialog__title')?.focus();
    }
    wasTitled.current = focusTitle;
  }, [focusTitle]);
  // open, fading, then closed; closed asks the owner once, in an effect, so no render reads a ref.

  const [phase, setPhase] = useState<ModalPhase>('open');
  // With no fade to wait on the owner is asked at once, in the event, as it
  // was before the fade: `asked` marks it, so the effect below asks no more.
  const close = (): void => {
    if (phase !== 'open') return;
    shutting.current = true;
    if (!prefersReducedMotion()) return setPhase('fading');
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

  // The Close button, Escape and a click outside ask the contents' guard first (claude-docs/
  // components/modal.md, "Unsaved changes"). The close handed to the contents is not guarded, so a
  // save or a delete goes at once. Nothing is asked once it is closing.
  const [guard] = useState(closeGuardSlot);
  // Held in state, so the contents redraw into it once it is in the page.
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [headerNote, setHeaderNote] = useState<HTMLElement | null>(null);

  // A question a form asks over itself (ConfirmOverlay) is drawn in the layer over the body, which
  // holds the body and the header control inert while it shows. The attribute is set on the
  // elements, not through a render, so it is on before the question takes the focus.
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
      footRef.current?.toggleAttribute('inert', on);
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
    // A dialog's own Escape only: React carries a nested dialog's cancel (a
    // confirmation opened from inside this one) up its tree to here, and the
    // browser sends Escape to the topmost dialog alone.
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    request();
  };

  // A click outside asks the owner to close it, as Escape does, but only a press that began there
  // too, so a selection dragged out of a field and let go over the backdrop keeps the form.
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

  const titleHeading = (
    <h2 id={titleId} className="modal-dialog__title" tabIndex={focusTitle ? -1 : undefined}>
      {title}
      {qualifier && (
        <>
          <span className="spoken-separator">,</span>{' '}
          <span className="modal-dialog__qualifier">{qualifier}</span>
        </>
      )}
    </h2>
  );
  const closeButton = (
    <button type="button" className="modal-dialog__close" aria-label="Close" onClick={request}>
      <span aria-hidden="true">×</span>
    </button>
  );

  // The backdrop's click is the pointer's alone; Escape is its keyboard equivalent, handled above.
  // oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
  return (
    <dialog
      ref={ref}
      className={cx('modal modal-dialog', size && `modal-dialog--${size}`, closing && 'is-closing')}
      // Focusable by script alone, for a dialog with no field to take the focus.
      tabIndex={-1}
      aria-labelledby={(eyebrow
        ? [eyebrowId, titleId]
        : destination
          ? [titleId, eyebrowId]
          : [titleId]
      ).join(' ')}
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      // The dialog's own fade, or its backdrop's, which reports here too.
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget) finish();
      }}
    >
      <div
        className={cx(
          'modal-dialog__header',
          topEnd !== undefined && 'modal-dialog__header--topped',
          headerAlign === 'center' && 'modal-dialog__header--centered',
        )}
      >
        {/* An edit dialog's head: what it does to what kind, then which entry. The hidden commas
            are for the dialog's name alone, which a screen reader would otherwise run together. */}
        <div
          className={`header modal-dialog__heading${actionsUnderClose && formalActions !== undefined ? ' modal-dialog__heading--under-close' : ''}`}
        >
          {/* The top line, with Close on it, first in the head as it is on screen. */}
          {topEnd !== undefined && (
            <div className="modal-dialog__top">
              {topEnd}
              {closeButton}
            </div>
          )}
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
          {aboveName}
          {formalActions !== undefined ? (
            <div className="modal-dialog__naming">
              {formalName}
              {titleHeading}
              <div className="modal-dialog__formal-actions">{formalActions}</div>
            </div>
          ) : (
            <>
              {formalName}
              {titleHeading}
            </>
          )}
          {under !== undefined && <div className="modal-dialog__under">{under}</div>}
        </div>
        {topEnd === undefined && closeButton}
        {/* Under the heading, for a sentence the contents put there
            (HeaderNoteContext), above the row of controls. */}
        <div ref={setHeaderNote} className="modal-dialog__header-note" />
        {/* Under the heading, for a control the contents put there
            (HeaderSlotContext): after the × in Tab order, as on screen. */}
        <div ref={putHeaderSlot} className="modal-dialog__header-slot" />
      </div>
      {/* The body scrolls beneath the header, rather than the whole dialog,
          so a question's layer can lie over exactly the part in view. */}
      <div className="modal-dialog__main">
        <div
          ref={body}
          className="modal-dialog__body"
          aria-busy={loading || undefined}
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling body must take a Tab stop so a keyboard can scroll it
          tabIndex={readingBody ? 0 : undefined}
        >
          <CloseGuardContext.Provider value={guard}>
            <HeaderSlotContext.Provider value={headerSlot}>
              <HeaderNoteContext.Provider value={headerNote}>
                <ConfirmLayerContext.Provider value={layer}>
                  {/* oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering */}
                  {typeof children === 'function' ? children(close) : children}
                </ConfirmLayerContext.Provider>
              </HeaderNoteContext.Provider>
            </HeaderSlotContext.Provider>
          </CloseGuardContext.Provider>
        </div>
        <div ref={setLayerHost} className="modal-dialog__layer" />
        {/* Under the body, outside what scrolls, so the body's scrollbar stops above it. */}
        {foot != null && foot !== false && (
          <div ref={footRef} className="modal-dialog__foot">
            {foot}
          </div>
        )}
      </div>
    </dialog>
  );
  // oxlint-enable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
};

export default Modal;
