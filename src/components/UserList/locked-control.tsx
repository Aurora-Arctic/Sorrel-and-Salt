'use client';

import { type ReactElement, useId, useState } from 'react';
import { useTip } from '../InfoTip/use-tip';
import type { LockedControlProps } from './types';
import './controls.scss';

// MB.59's locked Revoke, shared since MB.63 locks more controls the same way
// (claude-docs/components/user-list.md).

/**
 * A control that cannot be used, and says why: the primary admin's Change Role,
 * every Change Role while admin changes are paused to an admin the pause
 * binds, and the pause switch itself to any admin but the primary one (MB.63).
 * `aria-disabled` rather than `disabled`, so it keeps its place in the tab
 * order and a click still lands, which says why rather than doing nothing. The reason is the button's description, in a tip
 * that opens on hover, focus and a tap, stays open while the pointer is on it
 * and closes on Escape (WCAG 1.4.13), through InfoTip's `useTip`. Each
 * attempt also mounts the tip afresh as an alert, so a screen reader hears the
 * reason again. The tip is placed against the viewport rather than its cell:
 * the table's frame scrolls, so it would clip whatever reaches past it, and the
 * reason is taller than the heading row above the top row; `useTip` places it
 * fixed, and it follows the button through a scroll.
 */
const LockedControl = ({
  label,
  accessibleName,
  className,
  reason,
}: LockedControlProps): ReactElement => {
  const reasonId = useId();
  const { open, show, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip();
  const [attempts, setAttempts] = useState(0);

  return (
    // Hover on the wrapper, which holds the tip as well as the button, so the
    // pointer can move onto the tip without closing it.
    <span ref={anchor} className="user-list__locked" onMouseEnter={show} onMouseLeave={hideSoon}>
      <button
        className={className}
        type="button"
        aria-label={accessibleName}
        aria-disabled="true"
        aria-describedby={reasonId}
        onFocus={show}
        onBlur={hide}
        onClick={() => {
          show();
          setAttempts((count) => count + 1);
        }}
      >
        {label}
      </button>
      <span
        ref={bubble}
        key={attempts}
        id={reasonId}
        role={attempts ? 'alert' : 'tooltip'}
        className={open ? 'user-list__control-tip is-open' : 'user-list__control-tip'}
        aria-hidden={!open}
        style={bubbleStyle}
      >
        {reason}
      </span>
    </span>
  );
};

export default LockedControl;
