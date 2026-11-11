'use client';

import type { ReactElement } from 'react';
import TipAnchor from '../InfoTip/tip-anchor';
import { CrownIcon } from './icons';
import './controls.scss';

// The primary keeper's crown beside its role, a button whose tip behaves as InfoTip's through `useTip`
// (claude-docs/components/user-list.md, "Contracts").
const PrimaryAdminMark = (): ReactElement => (
  <TipAnchor
    className="user-list__primary"
    bubbleClass="user-list__control-tip"
    bubble="Primary Keeper"
  >
    {({ show, hide }) => (
      // A tap opens rather than toggles, as InfoTip's: on touch the emulated hover has already opened it.
      <button
        type="button"
        className="user-list__primary-mark"
        aria-label="Primary Keeper"
        onFocus={show}
        onBlur={hide}
        onClick={show}
      >
        <CrownIcon />
      </button>
    )}
  </TipAnchor>
);

export default PrimaryAdminMark;
