'use client';

import type { ReactElement, ReactNode } from 'react';
import { useTip } from '../InfoTip/use-tip';
import './index.scss';

// A mark or logo with a hover-only tip bubble, placed by `useTip`, hidden from assistive technology, taking no pointer
// (claude-docs/components/user-list.md, "Notes from code comments: the hint").
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
