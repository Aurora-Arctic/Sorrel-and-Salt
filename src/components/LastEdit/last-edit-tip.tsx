'use client';

import { type ReactElement, useId } from 'react';
import { useTip } from '../InfoTip/use-tip';
import { useHydrated } from '@/lib/hydrated';
import { relativePhrase } from './relative';
import './index.scss';

// The compact line is "Edited 3 days ago" once hydrated (it depends on the reader's clock), a date
// before. The text is a button so a keyboard reaches the tip, InfoTip's pattern rather than
// IconTip's: the sentence stays in the page, listed in `aria-describedby`.

export default function LastEditTip({
  moment,
  short,
  sentence,
}: {
  moment: string;
  short: string;
  sentence: string;
}): ReactElement {
  const id = useId();
  const hydrated = useHydrated();
  const { open, show, showSoon, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip();
  return (
    <span ref={anchor} className="last-edit__tip" onMouseEnter={showSoon} onMouseLeave={hideSoon}>
      <button
        type="button"
        className="last-edit__button"
        aria-describedby={id}
        onFocus={show}
        onBlur={hide}
        onClick={show}
      >
        Edited <time dateTime={moment}>{hydrated ? relativePhrase(new Date(moment)) : short}</time>
      </button>
      <span
        ref={bubble}
        id={id}
        role="tooltip"
        className={open ? 'last-edit__bubble is-open' : 'last-edit__bubble'}
        aria-hidden={!open}
        style={bubbleStyle}
      >
        {sentence}
      </span>
    </span>
  );
}
