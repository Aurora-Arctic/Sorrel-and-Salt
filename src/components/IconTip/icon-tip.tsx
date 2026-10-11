'use client';

import type { ReactElement } from 'react';
import { useTip } from '../InfoTip/use-tip';
import type { IconTipProps } from './types';
import './index.scss';

// A word above an icon control, "Edit" over a pencil, for a sighted user who
// cannot tell what the mark does (MB.115, the owner's call). It opens on
// hover and on the control's focus, stays while the pointer is on it, and
// closes on Escape, blur or the pointer leaving both (WCAG 1.4.13), through
// `useTip`, whose Escape is marked handled so a modal around it stays open.
// Decoration only: the control's own name already says Edit and what, so
// the tip is `aria-hidden` and describes nothing, which would read the word
// twice. Mounted only while open, so an open tip is one in the page
// (claude-docs/components/icon-tip.md).

const IconTip = ({ tip, children }: IconTipProps): ReactElement => {
  const { open, show, hide, hideSoon } = useTip();

  return (
    // Hover on the wrapper, which holds the tip as well as the control, so
    // the pointer can move onto the tip without closing it; focus heard here
    // too, as it bubbles from the control.
    <span
      className="icon-tip"
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <span role="tooltip" aria-hidden="true" className="icon-tip__bubble">
          {tip}
        </span>
      )}
    </span>
  );
};

export default IconTip;
