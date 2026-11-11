'use client';

import type { ReactElement } from 'react';
import TipAnchor from '../InfoTip/tip-anchor';
import { privilegeLedgerHref } from '../PrivilegeLedger/href';
import { HistoryIcon } from './icons';
import type { HistoryLinkProps } from './types';
import './controls.scss';

// A row's link to the privilege ledger searched for its user (address lower-cased); its tip behaves as InfoTip's, through `useTip`
// (claude-docs/components/user-list.md, "Contracts").
const HistoryLink = ({ email, name }: HistoryLinkProps): ReactElement => (
  <TipAnchor
    className="user-list__history"
    bubbleClass="user-list__control-tip"
    bubble="Privilege Changes"
  >
    {({ show, hide }) => (
      <a
        className="user-list__history-link"
        href={privilegeLedgerHref({ query: email.toLowerCase() })}
        aria-label={`Privilege changes for ${name}`}
        onFocus={show}
        onBlur={hide}
      >
        <HistoryIcon />
      </a>
    )}
  </TipAnchor>
);

export default HistoryLink;
