import type { ReactElement, ReactNode } from 'react';
import './index.scss';

// What a list draws with nothing in it, as a status region: the sentence, an optional explanation beneath
// it and an optional one thing to do next. `page` is a whole list that is empty, centred; `compact` is a
// table or a card section, left-aligned at body size (claude-docs/components/empty-state.md).

export type EmptyStateProps = {
  /** The region's name, "No Spells" or "No Matches". A compact state inside a table has none of its own. */
  label?: string;
  size?: 'page' | 'compact';
  /** The sentence. */
  children: ReactNode;
  /** A second paragraph under the sentence: who can fill the list, or what to try. */
  detail?: ReactNode;
  /** The one thing to do next: a button or a link. */
  action?: ReactNode;
  /** Draws a plain block with no status role, for a page that already announces its own count. */
  quiet?: boolean;
};

const EmptyState = ({
  label,
  size = 'page',
  children,
  detail,
  action,
  quiet = false,
}: EmptyStateProps): ReactElement => (
  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- holds paragraphs and an action, which <output> may not
  <div
    role={quiet ? undefined : 'status'}
    aria-label={quiet ? undefined : label}
    className={`empty-state empty-state--${size}`}
  >
    <p className="empty-state__text">{children}</p>
    {detail && <p className="empty-state__detail">{detail}</p>}
    {action && <div className="empty-state__action">{action}</div>}
  </div>
);

export default EmptyState;
