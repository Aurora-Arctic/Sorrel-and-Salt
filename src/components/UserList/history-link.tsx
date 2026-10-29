'use client';

import type { ReactElement } from 'react';
import { useTip } from '../InfoTip/use-tip';
import { privilegeLedgerHref } from '../PrivilegeLedger/href';
import { HistoryIcon } from './icons';
import type { HistoryLinkProps } from './types';

// A row's link to the privilege ledger searched for its user (address lower-cased); its tip behaves as InfoTip's, through `useTip`
// (claude-docs/components/user-list.md, "Marks, logos and links with tips").
const HistoryLink = ({ email, name }: HistoryLinkProps): ReactElement => {
  const { open, show, showSoon, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip();

  return (
    // Hover on the wrapper, which holds the tip as well as the link.
    <span
      ref={anchor}
      className="user-list__history"
      onMouseEnter={showSoon}
      onMouseLeave={hideSoon}
    >
      <a
        className="user-list__history-link"
        href={privilegeLedgerHref({ query: email.toLowerCase() })}
        aria-label={`Privilege changes for ${name}`}
        onFocus={show}
        onBlur={hide}
      >
        <HistoryIcon />
      </a>
      <span
        ref={bubble}
        role="tooltip"
        className={open ? 'user-list__history-tip is-open' : 'user-list__history-tip'}
        aria-hidden={!open}
        style={bubbleStyle}
      >
        Privilege Changes
      </span>
    </span>
  );
};

export default HistoryLink;
