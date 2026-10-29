'use client';

import { type ReactElement, useId } from 'react';
import { useTip } from '../InfoTip/use-tip';

type TipMarkProps = {
  /** The badge's word. */
  label: string;
  /** The badge palette, as `badge--<palette>`. */
  palette: 'retired' | 'annotated';
  /** The sentence the tip says. */
  tip: string;
};

// A badge that opens a tip (Retired, Annotated), on the same `useTip` and classes as StockBadge's Low
// badge. The tip's text stays in the page while closed and is listed in `aria-describedby`
// (claude-docs/components/entry-marks.md).
const TipMark = ({ label, palette, tip }: TipMarkProps): ReactElement => {
  const tipId = useId();
  const { open, show, showSoon, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip();
  return (
    // Hover on the wrapper, which holds the tip as well as the button, so the
    // pointer can move onto the tip without closing it.
    <span ref={anchor} className="entry-mark-tip" onMouseEnter={showSoon} onMouseLeave={hideSoon}>
      <button
        type="button"
        className={`badge badge--${palette} entry-mark entry-mark--tip`}
        aria-describedby={tipId}
        onFocus={show}
        onBlur={hide}
        onClick={show}
      >
        {label}
      </button>
      <span
        id={tipId}
        ref={bubble}
        style={bubbleStyle}
        role="tooltip"
        className={open ? 'entry-mark__tip is-open' : 'entry-mark__tip'}
        aria-hidden={!open}
      >
        {tip}
      </span>
    </span>
  );
};

export default TipMark;
