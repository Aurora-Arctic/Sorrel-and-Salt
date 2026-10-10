'use client';

import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTip } from '../InfoTip/use-tip';
import type { LockedControlProps } from './types';

// MB.59's locked Revoke, shared since MB.63 locks more controls the same way
// (claude-docs/components/user-list.md).

/**
 * A control that cannot be used, and says why: the primary admin's Revoke,
 * every Grant and Revoke while admin changes are paused to an admin the pause
 * binds, and the pause switch itself to any admin but the primary one (MB.63). `aria-disabled` rather than `disabled`, so it
 * keeps its place in the tab order and a click still lands, which says why
 * rather than doing nothing. The reason is the button's description, in a tip
 * that opens on hover, focus and a tap, stays open while the pointer is on it
 * and closes on Escape (WCAG 1.4.13), through InfoTip's `useTip`. Each
 * attempt also mounts the tip afresh as an alert, so a screen reader hears the
 * reason again. The tip is placed against the viewport rather than its cell:
 * the table's frame scrolls, so it clips whatever reaches past it, and the
 * reason is taller than the heading row above the top row. Any scroll closes
 * it, since it would no longer sit by the button.
 */
const LockedControl = ({
  label,
  accessibleName,
  className,
  reason,
}: LockedControlProps): ReactElement => {
  const reasonId = useId();
  const { open, show, hide, hideSoon } = useTip();
  const [attempts, setAttempts] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [place, setPlace] = useState<CSSProperties>();

  // Above the button from its left edge, as the cell's tips are, its bottom
  // margin apart, and kept off the screen's edges by its side margin, the
  // stylesheet's gutter, which the browser resolves to pixels. Placed at the
  // origin first and measured, so the offset holds whatever box an ancestor
  // makes the containing block of a fixed element (a transform does); the
  // measured origin includes the side margin, so it is not added twice.
  useLayoutEffect(() => {
    if (!open || !button.current || !tip.current) return;
    const bubble = tip.current;
    bubble.style.top = '0px';
    bubble.style.left = '0px';
    const origin = bubble.getBoundingClientRect();
    const at = button.current.getBoundingClientRect();
    const style = getComputedStyle(bubble);
    const gutter = parseFloat(style.marginLeft) || 0;
    const gap = parseFloat(style.marginBottom) || 0;
    const widest = window.innerWidth - origin.width - gutter;
    setPlace({
      top: at.top - origin.height - gap - origin.top,
      left: Math.max(gutter, Math.min(at.left, widest)) - origin.left,
    });
  }, [open, attempts]);

  useEffect(() => {
    if (!open) return;
    // Captured, so a scroll of the table's frame closes it as the page's does.
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [open, hide]);

  return (
    // Hover on the wrapper, which holds the tip as well as the button, so the
    // pointer can move onto the tip without closing it.
    <span className="user-list__locked" onMouseEnter={show} onMouseLeave={hideSoon}>
      <button
        ref={button}
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
        ref={tip}
        key={attempts}
        id={reasonId}
        role={attempts ? 'alert' : 'tooltip'}
        className={
          open
            ? 'user-list__control-tip user-list__control-tip--fixed is-open'
            : 'user-list__control-tip user-list__control-tip--fixed'
        }
        style={place}
        aria-hidden={!open}
      >
        {reason}
      </span>
    </span>
  );
};

export default LockedControl;
