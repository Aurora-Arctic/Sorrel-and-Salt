'use client';

import type { ReactElement } from 'react';
import { joinList } from '@/lib/join-list';
import TipAnchor from '../InfoTip/tip-anchor';
import type { CorrespondenceValueProps } from './types';
import './index.scss';

// A client part so the rows stay server-drawn (claude-docs/components/ingredient-entry.md, "Correspondence source tips").
const CorrespondenceValue = ({ value, sources }: CorrespondenceValueProps): ReactElement => (
  <TipAnchor
    className="ingredient-entry__source-anchor"
    bubbleClass="ingredient-entry__source-tip"
    bubble={joinList(sources, 'and')}
  >
    {({ show, hide }) => (
      // A tap opens rather than toggles, as InfoTip's: on touch the emulated hover has already opened it.
      <button
        type="button"
        className="ingredient-entry__source-value"
        onFocus={show}
        onBlur={hide}
        onClick={show}
      >
        {value}
      </button>
    )}
  </TipAnchor>
);

export default CorrespondenceValue;
