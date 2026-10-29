'use client';

import { type ReactElement, useId } from 'react';
import { useTip } from '../InfoTip/use-tip';
import { useHydrated } from '@/lib/hydrated';
import { relativePhrase } from './relative';
import './index.scss';

// The compact line and its tooltip: "Edited 3 days ago" once hydrated (`useHydrated`, since it
// depends on the reader's clock), "Edited 1 Sep 2026" before, inside the `<time>`; the full
// sentence is the tip. The text is a button so a keyboard reaches the tip, InfoTip's pattern rather
// than IconTip's: it lists the tip in `aria-describedby` and the sentence stays in the page while
// closed.

export default function LastEditTip({
  moment,
  short,
  sentence,
}: {
  /** The moment, as an ISO 8601 string. */
  moment: string;
  /** The short absolute date, the line's text before hydration. */
  short: string;
  /** The full sentence the tip holds: "Last edited by Fixture A on 1 September 2026". */
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
