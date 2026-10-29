'use client';

import type { ReactElement } from 'react';
import { useTip } from '../InfoTip/use-tip';
import { CrownIcon } from './icons';
import './controls.scss';

// The primary admin's crown beside its role, a button whose tip behaves as InfoTip's through `useTip`
// (claude-docs/components/user-list.md, "Marks, logos and links with tips").
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
