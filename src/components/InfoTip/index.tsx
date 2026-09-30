'use client';

import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import type { InfoTipProps } from './types';
import './index.scss';

// A field's hint behind an ⓘ beside its label, rather than a line beneath it.
// It opens on hover, on a tap, and on focus — the ⓘ's, or the field's own, so
// a keyboard that skips buttons still shows it — stays open while the pointer
// is on it, and closes on Escape (WCAG 1.4.13) or once the field takes input.
// The text stays in the page while closed, faded out and `aria-hidden` rather
// than unmounted, so the field it describes still reads it
// (claude-docs/components/info-tip.md).

// Long enough to cross from the button onto the tip.
const CLOSE_DELAY_MS = 150;

const InfoTip = ({ id, label, controlId, children }: InfoTipProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    clearTimeout(closing.current);
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    clearTimeout(closing.current);
    setOpen(false);
  }, []);
  const hideSoon = () => {
    clearTimeout(closing.current);
    closing.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => {
    if (!open) return;
    // On the document: a tip opened by hover has no focus to listen from.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, hide]);

  // The field is rendered by whoever holds the tip, so it is found by id
  // rather than handed down as an element. Input closes the tip: whoever is
  // typing, or has chosen, has read it, and it stays shut until the field is
  // entered again.
  useEffect(() => {
    const control = controlId ? document.getElementById(controlId) : null;
    if (!control) return;
    control.addEventListener('focus', show);
    control.addEventListener('blur', hide);
    control.addEventListener('input', hide);
    return () => {
      control.removeEventListener('focus', show);
      control.removeEventListener('blur', hide);
      control.removeEventListener('input', hide);
    };
  }, [controlId, show, hide]);

  useEffect(() => () => clearTimeout(closing.current), []);

  return (
    // Hover on the wrapper, which holds the tip as well as the button, so the
    // pointer can move onto the tip without closing it.
    <span className="info-tip" onMouseEnter={show} onMouseLeave={hideSoon}>
      {/* A tap opens rather than toggles: on touch the emulated hover has
          already opened it, and a toggle would shut it again at once. */}
      <button
        type="button"
        className="info-tip__button"
        aria-label={`About ${label}`}
        aria-describedby={id}
        onFocus={show}
        onBlur={hide}
        onClick={show}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.25" />
          <circle cx="8" cy="4.75" r="0.9" fill="currentColor" />
          <path d="M8 7v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <span
        id={id}
        role="tooltip"
        className={open ? 'info-tip__bubble is-open' : 'info-tip__bubble'}
        aria-hidden={!open}
      >
        {children}
      </span>
    </span>
  );
};

export default InfoTip;
