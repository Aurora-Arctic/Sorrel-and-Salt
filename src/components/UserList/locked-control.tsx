'use client';

import { type ReactElement, useId, useState } from 'react';
import TipAnchor from '../InfoTip/tip-anchor';
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
  const [attempts, setAttempts] = useState(0);

  return (
    // A press re-keys the bubble as an alert, so a screen reader reads the reason again.
    <TipAnchor
      className="user-list__locked"
      bubbleClass="user-list__control-tip"
      bubbleId={reasonId}
      bubbleRole={attempts ? 'alert' : 'tooltip'}
      bubbleKey={attempts}
      bubble={reason}
    >
      {({ show, hide }) => (
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
      )}
    </TipAnchor>
  );
};

export default LockedControl;
