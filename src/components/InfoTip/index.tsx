'use client';

import type { ReactElement } from 'react';
import type { InfoTipProps } from './types';
import { useTip } from './use-tip';
import './index.scss';

// A field's hint behind an ⓘ beside its label. It opens on hover, tap and the ⓘ's focus, never the
// field's, and closes on Escape (WCAG 1.4.13), through `useTip`. The text stays in the page, faded out
// and `aria-hidden`, so the field still reads it (claude-docs/components/info-tip.md).

const InfoTip = ({ id, label, children }: InfoTipProps): ReactElement => {
  const { open, show, showSoon, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip();

  return (
    // Hover on the wrapper, which holds the tip as well as the button, so the
    // pointer can move onto the tip without closing it.
    <span ref={anchor} className="info-tip" onMouseEnter={showSoon} onMouseLeave={hideSoon}>
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
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8" cy="4.75" r="0.9" fill="currentColor" />
          <path d="M8 7v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <span
        ref={bubble}
        id={id}
        role="tooltip"
        className={open ? 'info-tip__bubble is-open' : 'info-tip__bubble'}
        aria-hidden={!open}
        style={bubbleStyle}
      >
        {children}
      </span>
    </span>
  );
};

export default InfoTip;
