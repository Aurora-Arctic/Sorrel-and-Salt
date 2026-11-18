'use client';

import { type ReactElement, useId } from 'react';
import TipAnchor from '../InfoTip/tip-anchor';
import type { CorrespondenceValueProps } from './types';
import ValueCard from './value-card';
import './index.scss';

// A client part so the rows stay server-drawn (claude-docs/components/ingredient-entry.md, "Correspondence cards").
const CorrespondenceValue = ({ value, card }: CorrespondenceValueProps): ReactElement => {
  const cardId = useId();
  return (
    // Pinned by a press: a tap on a scrolled page is followed by a pointer-leave that would close it;
    // blur closes at once, not after the anchor's delay, so moving on shows one card.
    <TipAnchor
      className="ingredient-entry__value-anchor"
      bubbleClass="ingredient-entry__value-card"
      bubbleId={cardId}
      bubble={<ValueCard {...card} />}
      pinnable
    >
      {({ toggle, hide }) => (
        <span
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a span, not a button: a button is an inline-block, so a long value would wrap as a box and push the comma off it
          role="button"
          tabIndex={0}
          className="ingredient-entry__value"
          aria-describedby={cardId}
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
