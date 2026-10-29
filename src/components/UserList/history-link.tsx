'use client';

import type { ReactElement } from 'react';
import { useTip } from '../InfoTip/use-tip';
import { privilegeLedgerHref } from '../PrivilegeLedger/href';
import { HistoryIcon } from './icons';
import type { HistoryLinkProps } from './types';

// A row's way into the privilege ledger narrowed to its user: the
// ledger's search opened with their address, lower-cased as every address is
// held. An icon before the name, named "Privilege changes for <name>",
// with a tip reading Privilege Changes, the ledger's one name, that behaves as InfoTip's does,
// through the same `useTip`: opened by hover, focus or a tap, kept open while
// the pointer is on it, and closed on Escape (WCAG 1.4.13). The tip says less
// than the link's name, so it describes nothing, and is hidden from
// assistive technology while closed, as InfoTip's is
// (claude-docs/components/user-list.md).
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
