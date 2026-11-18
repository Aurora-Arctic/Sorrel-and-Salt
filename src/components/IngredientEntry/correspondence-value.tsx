'use client';

import { type ReactElement, useId } from 'react';
import { joinList } from '@/lib/join-list';
import TipAnchor from '../InfoTip/tip-anchor';
import type { CorrespondenceValueProps } from './types';
import './index.scss';

// A span, not a <button>: a button is an inline-block, so a long value would wrap as a centred box and push the comma off it.
// A client part so the rows stay server-drawn (claude-docs/components/ingredient-entry.md, "Correspondence source tips").
const CorrespondenceValue = ({ value, sources }: CorrespondenceValueProps): ReactElement => {
  const tipId = useId();
  return (
    // Pinned by a press: a tap on a scrolled page is followed by a pointer-leave that would close it;
    // blur closes at once, not after the anchor's delay, so moving on shows one tip.
    <TipAnchor
      className="ingredient-entry__source-anchor"
      bubbleClass="ingredient-entry__source-tip"
      bubbleId={tipId}
      bubble={joinList(sources, 'and')}
      pinnable
    >
      {({ toggle, hide }) => (
        <span
          role="button"
          tabIndex={0}
          className="ingredient-entry__source-value"
          aria-describedby={tipId}
          onBlur={hide}
          onClick={toggle}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            toggle();
          }}
        >
          {value}
        </span>
      )}
    </TipAnchor>
  );
};

export default CorrespondenceValue;
