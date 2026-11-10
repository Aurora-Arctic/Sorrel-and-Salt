'use client';

import { type ReactElement, useId } from 'react';
import TipAnchor from '../InfoTip/tip-anchor';

type TipMarkProps = {
  label: string;
  palette: 'retired' | 'annotated' | 'local';
  tip: string;
};

// A badge that opens a tip (Retired, Annotated), on the same `useTip` and classes as StockBadge's Low
// badge. The tip's text stays in the page while closed and is listed in `aria-describedby`
// (claude-docs/components/entry-marks.md).
const TipMark = ({ label, palette, tip }: TipMarkProps): ReactElement => {
  const tipId = useId();
  return (
    <TipAnchor
      className="entry-mark-tip"
      bubbleClass="entry-mark__tip"
      bubbleId={tipId}
      bubble={tip}
    >
      {({ show, hide }) => (
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
      )}
    </TipAnchor>
  );
};

export default TipMark;
