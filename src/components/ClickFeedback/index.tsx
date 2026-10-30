'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { CrossIcon } from '../IconTip/icons';
import { useFade } from './fade';
import { useBadgePlace, useCalloutPlace } from './position';
import { useAnnounce } from './status-region';
import type { ClickFeedback, ClickFeedbackOptions } from './types';
import './index.scss';

// What a click outside a form says when it fails: the service's sentence in an alert callout under the
// control, a badge that brings it back, and the control described by the failure until a later try
// clears it (claude-docs/components/click-feedback.md; claude-docs/design-decisions/m12.31-click-feedback-outside-forms.md §5).

/**
 * The control's own document, for its listeners and events: in a story Storybook draws into an iframe,
 * so the global `document` is not the one a key or press reaches.
 */
const docOf = (node: Node | null | undefined): Document => node?.ownerDocument ?? document;

/**
 * Raised on the document as a callout opens, naming it, so every other closes:
 * one alert on the screen at once. An event rather than a shared store, so a
 * control needs no provider for it and nothing outlives the page.
 */
const OPENED = 'click-feedback:opened';

const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;

/**
 * Whether the control shows no border (a text button or menu item), so its badge goes beside it. Read
 * from the drawn style, since every `.btn` has a border, `.btn--quiet` included.
 */
function borderless(node: HTMLElement): boolean {
  const style = (node.ownerDocument.defaultView ?? window).getComputedStyle(node);
  return SIDES.every(
    (side) =>
      parseFloat(style[`border${side}Width`]) === 0 ||
      style[`border${side}Style`] === 'none' ||
      style[`border${side}Color`] === 'transparent' ||
      style[`border${side}Color`] === 'rgba(0, 0, 0, 0)',
  );
}

const PREFIX = 'Last try failed: ';

/** `token` added to or taken from a space-separated attribute, the others kept. */
function retoken(node: Element, attribute: string, token: string, present: boolean): void {
  const others = (node.getAttribute(attribute) ?? '').split(/\s+/).filter((t) => t && t !== token);
  const next = present ? [...others, token] : others;
  if (next.length) node.setAttribute(attribute, next.join(' '));
  else node.removeAttribute(attribute);
}

/**
 * A control's click feedback. The control takes `anchorRef` as its `ref`, and
 * `feedback` is rendered directly after it: the badge is then the next tab
 * stop, and the callout the one after.
 */
export function useClickFeedback({ name }: ClickFeedbackOptions): ClickFeedback {
  const announce = useAnnounce();
  const id = useId();
  const calloutId = `${id}callout`;
  const describedId = `${id}failed`;

  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [message, setMessage] = useState<string>();
  // The last sentence reported, kept while a cleared callout fades out.
  const [said, setSaid] = useState('');
  const [open, setOpen] = useState(false);
  // Counts the opens: each open draws a new alert, which is then read again.
  const [opens, setOpens] = useState(0);
  const [beside, setBeside] = useState(false);

  // What opened the callout, which the focus goes back to: the control for a
  // failure, the badge for a reopening.
  const opener = useRef<HTMLElement | null>(null);
  const badgeNode = useRef<HTMLButtonElement | null>(null);
  const calloutNode = useRef<HTMLDivElement | null>(null);

  const calloutFade = useFade(open);
  const badgeFade = useFade(message !== undefined);
  const calloutPlace = useCalloutPlace(anchor, calloutFade.drawn);
  const badgePlace = useBadgePlace(anchor, badgeFade.drawn, beside);

  // The control also in a ref, for `report`: a report made before the
  // control's first render is over (a press on mount) would read the state as
  // null, and take the corner and no opener.
  const anchorNode = useRef<HTMLElement | null>(null);
  const anchorRef = useCallback((node: HTMLElement | null) => {
    anchorNode.current = node;
    setAnchor(node);
  }, []);

  /** Whether `target` is the control, the badge, the callout, or inside one. */
  const ours = useCallback(
    // Asked of the target rather than `instanceof Node`, false across an iframe.
    (target: EventTarget | null): boolean =>
      typeof (target as Node | null)?.nodeType === 'number' &&
      [anchor, badgeNode.current, calloutNode.current].some((node) =>
        node?.contains(target as Node),
      ),
    [anchor],
  );

  const openFrom = useCallback(
    (from: HTMLElement | null) => {
      opener.current = from;
      setOpen(true);
      setOpens((n) => n + 1);
      docOf(from ?? anchorNode.current).dispatchEvent(new CustomEvent(OPENED, { detail: id }));
    },
    [id],
  );

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) opener.current?.focus();
  }, []);

  const report = useCallback(
    (next: string | undefined) => {
      const control = anchorNode.current;
      if (next === undefined) {
        // The badge and the callout go, so a focus inside them would fall to
        // the page: it goes to the control they belonged to instead.
        const active = docOf(control).activeElement;
        if (ours(active) && active !== control) control?.focus();
        setMessage(undefined);
        setOpen(false);
        return;
      }
      setMessage(next);
      setSaid(next);
      setBeside(control ? borderless(control) : false);
      openFrom(control);
    },
    [ours, openFrom],
  );

  // The control described by its last failure, beside any description it has.
  useEffect(() => {
    if (!anchor || message === undefined) return;
    retoken(anchor, 'aria-describedby', describedId, true);
    return () => retoken(anchor, 'aria-describedby', describedId, false);
  }, [anchor, message, describedId]);

  // Open, it closes on Escape, on the focus or a press leaving the control,
  // the badge and the callout (WCAG 2.4.11: it must not hide what the focus
  // moves to), and when another callout opens.
  useEffect(() => {
    if (!open) return;
    const doc = docOf(anchor);
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      // Taken, so a <dialog> the control is in does not close with it.
      event.preventDefault();
      close(true);
    };
    const onLeave = (event: Event): void => {
      if (!ours(event.target)) close(false);
    };
    const onOther = (event: Event): void => {
      if ((event as CustomEvent<string>).detail !== id) close(false);
    };
    doc.addEventListener('keydown', onKey);
    doc.addEventListener('pointerdown', onLeave);
    doc.addEventListener('focusin', onLeave);
    doc.addEventListener(OPENED, onOther);
    return () => {
      doc.removeEventListener('keydown', onKey);
      doc.removeEventListener('pointerdown', onLeave);
      doc.removeEventListener('focusin', onLeave);
      doc.removeEventListener(OPENED, onOther);
    };
  }, [open, ours, close, id, anchor]);

  const feedback: ReactElement = (
    <>
      {badgeFade.drawn && (
        <button
          ref={(node) => {
            badgeNode.current = node;
            badgePlace.setFloating(node);
          }}
          type="button"
          className={[
            'click-feedback__badge',
            beside && 'click-feedback__badge--beside',
            badgePlace.placed && 'is-placed',
            badgeFade.closing && 'is-closing',
          ]
            .filter(Boolean)
            .join(' ')}
          style={badgePlace.style}
          aria-label={`Show the error for ${name}`}
          aria-expanded={open}
          aria-controls={calloutFade.drawn ? calloutId : undefined}
          // Fading out, it is no longer there to press or reach.
          inert={badgeFade.closing || undefined}
          onClick={(event) => (open ? close(false) : openFrom(event.currentTarget))}
          onAnimationEnd={badgeFade.onAnimationEnd}
        />
      )}
      {message !== undefined && (
        // `hidden`, as a description is read through the control it describes
        // and would otherwise be read a second time in the page's text.
        <span id={describedId} hidden>
          {PREFIX + message}
        </span>
      )}
      {calloutFade.drawn && (
        <div
          key={opens}
          ref={(node) => {
            calloutNode.current = node;
            calloutPlace.setFloating(node);
          }}
          id={calloutFade.closing ? undefined : calloutId}
          role={calloutFade.closing ? undefined : 'alert'}
          className={[
            'click-feedback__callout',
            calloutPlace.placed && 'is-placed',
            calloutFade.closing && 'is-closing',
          ]
            .filter(Boolean)
            .join(' ')}
          style={calloutPlace.style}
          inert={calloutFade.closing || undefined}
          aria-hidden={calloutFade.closing || undefined}
          onAnimationEnd={calloutFade.onAnimationEnd}
        >
          {said}
          <button
            type="button"
            className="click-feedback__dismiss"
            aria-label="Dismiss"
            onClick={() => close(true)}
          >
            <CrossIcon />
          </button>
        </div>
      )}
    </>
  );

  return { anchorRef, report, announce, feedback };
}
