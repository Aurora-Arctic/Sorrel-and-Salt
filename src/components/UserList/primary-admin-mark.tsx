'use client';

import type { ReactElement } from 'react';
import { useTip } from '../InfoTip/use-tip';
import { CrownIcon } from './icons';
import './controls.scss';

// The primary admin's mark beside its role: a crown named "Primary Admin",
// with a tip saying so that behaves as InfoTip's does, through the same
// `useTip`: opened by hover, focus or a tap, kept open while the pointer is on
// it, and closed on Escape (WCAG 1.4.13). The mark is a button, as InfoTip's
// ⓘ is, so the keyboard reaches the tip too. The tip says no more than the
// button's name, so it is hidden from assistive technology while closed, as
// InfoTip's is (claude-docs/components/user-list.md).
const PrimaryAdminMark = (): ReactElement => {
  const { open, show, showSoon, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip();

  return (
    // Hover on the wrapper, which holds the tip as well as the mark.
    <span
      ref={anchor}
      className="user-list__primary"
      onMouseEnter={showSoon}
      onMouseLeave={hideSoon}
    >
      {/* A tap opens rather than toggles, as InfoTip's: on touch the emulated
          hover has already opened it. */}
      <button
        type="button"
        className="user-list__primary-mark"
        aria-label="Primary Admin"
        onFocus={show}
        onBlur={hide}
        onClick={show}
      >
        <CrownIcon />
      </button>
      <span
        ref={bubble}
        role="tooltip"
        className={open ? 'user-list__control-tip is-open' : 'user-list__control-tip'}
        aria-hidden={!open}
        style={bubbleStyle}
      >
        Primary Admin
      </span>
    </span>
  );
};

export default PrimaryAdminMark;
