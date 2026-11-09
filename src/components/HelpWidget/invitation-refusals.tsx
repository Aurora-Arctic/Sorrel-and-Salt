import type { ReactElement } from 'react';
import { ChevronIcon } from '../IconTip/icons';
import { CARD_REFUSAL_MESSAGES, INVITATION_REFUSAL_MESSAGES } from '@/modules/identity';
import { REFUSAL_FIXES } from './invitation-refusal-fixes';
import { PrintedCardMark, RefusalWho } from './refusal-parts';
import RefusalFinder from './refusal-finder';
import type { RefusalEntry } from './types';
import '../CollapsibleSection/index.scss';

// Every message the accept page can give, read from the invitation service's own tables, so a reason added there shows
// here. The service is server-only, so this shell reads it and hands the messages to the picker as props; the list it
// draws itself is what a reader sees before the script runs (claude-docs/components/help-pages.md, "Widgets").

// The service's order, each printed card's wording straight after the link message it replaces.
const ENTRIES: readonly RefusalEntry[] = Object.entries(INVITATION_REFUSAL_MESSAGES).flatMap(
  ([reason, message]) => {
    const fixes = REFUSAL_FIXES[reason as keyof typeof REFUSAL_FIXES];
    const card = CARD_REFUSAL_MESSAGES[reason as keyof typeof CARD_REFUSAL_MESSAGES];
    const link: RefusalEntry = {
      key: reason,
      message,
      card: false,
      ...fixes.link,
      action: fixes.action,
    };
    if (!card || !fixes.card) return [link];
    return [link, { key: `${reason}-card`, message: card, card: true, ...fixes.card }];
  },
);

const EVERY_MESSAGE = 'Every Message the Page Can Give';

const InvitationRefusals = (): ReactElement => (
  <figure className="figure help-widget">
    <RefusalFinder entries={ENTRIES} />
    <details className="collapsible-section help-widget__disclosure">
      <summary className="collapsible-section__head" aria-label={EVERY_MESSAGE}>
        <span className="collapsible-section__line">
          <span className="collapsible-section__title">{EVERY_MESSAGE}</span>
          <span className="collapsible-section__chevron" aria-hidden="true">
            <ChevronIcon />
          </span>
        </span>
      </summary>
      <ul className="collapsible-section__fields help-widget__every" aria-label={EVERY_MESSAGE}>
        {ENTRIES.map((entry) => (
          <li key={entry.key}>
            {entry.card && <PrintedCardMark />}
            {entry.card && ' '}
            {entry.message}{' '}
            <span className="help-widget__fix">
              <RefusalWho who={entry.who} /> {entry.now}
            </span>
          </li>
        ))}
      </ul>
    </details>
    <figcaption>What the accept page says when it cannot take an invitation.</figcaption>
  </figure>
);

export default InvitationRefusals;
