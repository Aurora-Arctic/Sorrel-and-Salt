'use client';

import { type ReactElement, useContext, useEffect, useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmLayerContext } from './confirm-layer';
import { FIRST_FIELD } from './fields';
import type { ConfirmOverlayProps } from './types';
import './index.scss';

// A question a form asks before it acts ("Delete this?", "Discard them?"), drawn as a card over the
// form. In a modal it goes into the modal's layer, centred in the part of the body in view; outside
// one it stands in the form's flow (claude-docs/components/modal.md, "Asking over the form").

/**
 * Whether the element can take the focus back: in the page and not held inert. Asked of the
 * element, not `instanceof HTMLElement`, which is false in a story Storybook draws into an iframe.
 */
const canFocus = (element: Element | null): element is HTMLElement =>
  typeof (element as HTMLElement | null)?.focus === 'function' &&
  element !== null &&
  element.isConnected &&
  element !== element.ownerDocument.body &&
  element.closest('[inert]') === null;

/**
 * The question as a card over the form: in the modal's layer while there is
 * one, otherwise in place. Takes the focus on its safe answer as it comes,
 * and gives it back as it goes.
 */
export function ConfirmOverlay(props: ConfirmOverlayProps): ReactElement | null {
  const layer = useContext(ConfirmLayerContext);
  // The modal draws its layer before its contents can ask, but not before
  // their first render: nothing until it is there, rather than a card in
  // place that moves.
  if (layer && !layer.host) return null;
  const card = <Card {...props} overlay={layer !== null} />;
  return layer?.host ? createPortal(card, layer.host) : card;
}

function Card({
  question,
  labelledBy,
  safe,
  flashes,
  children,
  overlay,
}: ConfirmOverlayProps & { overlay: boolean }): ReactElement {
  const layer = useContext(ConfirmLayerContext);
  const id = useId();
  const self = useRef<HTMLFieldSetElement>(null);

  // As it comes, before paint: the form behind held inert, the focus on the safe answer. As it
  // goes, the form live again first, so the focus can go back to where it was, else the first
  // field. A layout effect, so a question giving way to another hands the focus over in one commit.
  useLayoutEffect(() => {
    const returnTo = self.current?.ownerDocument.activeElement ?? null;
    const scope = layer?.body.current ?? self.current?.closest('form') ?? null;
    const release = layer?.hold();
    safe.current?.focus({ preventScroll: true });
    // Again after the browser's own turn: the event that opened the question may still move the
    // focus once its handler returns. A question still up that lost it takes it back, so Keep
    // Editing has it every time.
    const again = requestAnimationFrame(() => {
      const card = self.current;
      if (card && !card.contains(card.ownerDocument.activeElement)) {
        safe.current?.focus({ preventScroll: true });
      }
    });
    return () => {
      cancelAnimationFrame(again);
      release?.();
      if (canFocus(returnTo)) returnTo.focus();
      else scope?.querySelector<HTMLElement>(FIRST_FIELD)?.focus();
    };
  }, [layer, safe]);

  // Each try at a way out while asking puts the focus back on the safe
  // answer, wherever it had gone meanwhile.
  useEffect(() => {
    if (flashes) safe.current?.focus({ preventScroll: true });
  }, [flashes, safe]);

  return (
    <div className={overlay ? 'confirm-overlay' : 'confirm-overlay confirm-overlay--in-place'}>
      {/* A group named by its question — a fieldset, the element whose role
          that is — rather than an alertdialog: it traps nothing, the modal's
          Close stays live beside it, and Escape is the modal's, as it was
          before the question moved (modal.md). */}
      <fieldset
        ref={self}
        aria-labelledby={labelledBy ?? id}
        className="confirm-overlay__card"
        data-flash={flashes}
      >
        {/* The flash, a fresh element per try so its animation runs each time. */}
        {flashes ? <span key={flashes} className="confirm-overlay__flash" aria-hidden /> : null}
        {question !== undefined && (
          <p id={id} className="confirm-overlay__question">
            {question}
          </p>
        )}
        {children}
      </fieldset>
    </div>
  );
}
