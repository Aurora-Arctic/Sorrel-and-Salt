'use client';

import type { ReactElement, ReactNode } from 'react';
import TipAnchor from '../InfoTip/tip-anchor';
import './index.scss';

// A mark or logo with a hover-only tip bubble, placed by `useTip`, hidden from assistive technology, taking no pointer
// (claude-docs/components/user-list.md, "Contracts").
const Hint = ({
  className,
  label,
  children,
}: {
  className: string;
  label: string;
  children: ReactNode;
}): ReactElement => (
  <TipAnchor className={className} bubbleClass="user-list__tip" bubbleRole="none" bubble={label}>
    {children}
  </TipAnchor>
);

export default Hint;
