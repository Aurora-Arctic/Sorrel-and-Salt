'use client';

import type { ReactElement, ReactNode } from 'react';
import { useTip } from '../InfoTip/use-tip';
import './index.scss';

// A mark or a logo that says what it is in a tip bubble on hover (the provider
// logos, and the yes-or-no marks whose column heading does not say it). The
// bubble is the eye's copy, hidden from assistive technology, since the mark
// carries its word as hidden text. It opens on hover only, as before it was
// CSS's; it is placed by `useTip` so it stays on the screen, centred over the
// mark where there is room. It takes no pointer, so it never blocks the row it
// overlaps (claude-docs/components/user-list.md).
const Hint = ({
  className,
  label,
  children,
}: {
  className: string;
  label: string;
  children: ReactNode;
}): ReactElement => {
  const { open, showSoon, hideSoon, anchor, bubble, bubbleStyle } = useTip();

  return (
    <span ref={anchor} className={className} onMouseEnter={showSoon} onMouseLeave={hideSoon}>
      {children}
      <span
        ref={bubble}
        className={open ? 'user-list__tip is-open' : 'user-list__tip'}
        aria-hidden="true"
        style={bubbleStyle}
      >
        {label}
      </span>
    </span>
  );
};

export default Hint;
