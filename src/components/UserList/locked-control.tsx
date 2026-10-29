'use client';

import { type ReactElement, useId, useState } from 'react';
import { useTip } from '../InfoTip/use-tip';
import type { LockedControlProps } from './types';
import './controls.scss';

// The locked Revoke, shared by every control that locks the same way
// (claude-docs/components/user-list.md).

/**
 * A control that cannot be used, and says why. `aria-disabled` keeps it in the tab order, and
 * its reason is a tip placed against the viewport (claude-docs/components/user-list.md,
 * "Locked controls").
 */
const LockedControl = ({
  label,
  accessibleName,
  className,
  reason,
}: LockedControlProps): ReactElement => {
  const reasonId = useId();
  const { open, show, showSoon, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip();
  const [attempts, setAttempts] = useState(0);

  return (
    // Hover on the wrapper, which holds the tip as well as the button, so the
    // pointer can move onto the tip without closing it.
    <span
      ref={anchor}
      className="user-list__locked"
      onMouseEnter={showSoon}
      onMouseLeave={hideSoon}
    >
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
