import { type ReactElement, type ReactNode, useId } from 'react';
import { ChevronIcon } from '../Combobox/icons';
import type { CollapsibleSectionProps, FoldFlagProps, FoldIds, FoldIdsOptions } from './types';
import './index.scss';

export { FoldAll } from './fold-all';

/**
 * What a folding block (a section or a variant's card) names its parts by: the ids its toggle points
 * at, its `is-open` and `is-invalid` class, and the toggle's description. One hook, so the two folds
 * wire alike.
 */
export function useFoldIds({ block, open, invalid, flagged }: FoldIdsOptions): FoldIds {
  const id = useId();
  const summaryId = `${id}-summary`;
  const flagId = `${id}-flag`;
  return {
    id,
    summaryId,
    flagId,
    fieldsId: `${id}-fields`,
    className: [block, open && 'is-open', invalid && 'is-invalid'].filter(Boolean).join(' '),
    describedBy: [!open && summaryId, flagged && flagId].filter(Boolean).join(' ') || undefined,
  };
}

/** The flag beneath a fold's heading while it holds an error, which its toggle is described by. */
export function FoldFlag({ id, className, shown }: FoldFlagProps): ReactNode {
  return shown ? (
    <span id={id} className={className}>
      Has an error to fix
    </span>
  ) : null;
}

/**
 * A form section as a disclosure under an `h3` (`h4` when nested): the heading's text is a button,
 * with a one-line summary of what is entered while closed and a flag on error. Fields stay in the
 * page while closed, hidden (claude-docs/components/collapsible-section.md, "Source notes").
 */
export function CollapsibleSection({
  title,
  summary,
  fold: { open, invalid, onToggle },
  level = 3,
  info,
  titleId,
  children,
}: CollapsibleSectionProps): ReactElement {
  // Flagged open or closed: the heading stays in view either way.
  const { summaryId, flagId, fieldsId, className, describedBy } = useFoldIds({
    block: 'collapsible-section',
    open,
    invalid,
    flagged: invalid,
  });
  const Heading = level === 4 ? 'h4' : 'h3';
  return (
    <section className={className}>
      <div className="collapsible-section__head">
        <div className="collapsible-section__line">
          <Heading className="collapsible-section__title">
            <button
              id={titleId}
              type="button"
              className="collapsible-section__toggle"
              aria-expanded={open}
              aria-controls={fieldsId}
              aria-describedby={describedBy}
              onClick={onToggle}
            >
              {title}
            </button>
          </Heading>
          {info}
          {/* Drawn only: the whole line is the button's, through its overlay. */}
          <span className="collapsible-section__chevron" aria-hidden="true">
            <ChevronIcon />
          </span>
        </div>
        <span id={summaryId} className="collapsible-section__summary" hidden={open}>
          {summary}
        </span>
        <FoldFlag id={flagId} className="collapsible-section__flag" shown={invalid} />
      </div>
      <div id={fieldsId} className="collapsible-section__fields" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
