'use client';

import { type ReactElement, useId } from 'react';
import { useTip } from '../InfoTip/use-tip';

// The Retired badge (M12.24, tip added in M8.14): a compendium entry the
// curators retired, read because this coven's cupboard still names it. A button
// whose only job is to open a tip saying so, built on the same `useTip` and
// classes as StockBadge's Low badge rather than a shared piece: the two differ
// in their text and palette and in nothing else worth a seam. The tip's text
// stays in the page while closed and the button lists it in `aria-describedby`,
// so a screen reader hears the reason without opening it. claude-docs/components/entry-marks.md.
const RetiredMark = (): ReactElement => {
  const tipId = useId();
  const { open, show, hide, hideSoon } = useTip();
  return (
    // Hover on the wrapper, which holds the tip as well as the button, so the
    // pointer can move onto the tip without closing it.
    <span className="entry-mark-tip" onMouseEnter={show} onMouseLeave={hideSoon}>
      <button
        type="button"
        className="badge badge--retired entry-mark entry-mark--retired"
        aria-describedby={tipId}
        onFocus={show}
        onBlur={hide}
        onClick={show}
      >
        Retired
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={open ? 'entry-mark__tip is-open' : 'entry-mark__tip'}
        aria-hidden={!open}
      >
        No longer in the Compendium; your coven still has it.
      </span>
    </span>
  );
};

export default RetiredMark;
