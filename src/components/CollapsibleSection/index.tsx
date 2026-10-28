import { type ReactElement, type ReactNode, useId } from 'react';
import { ChevronIcon } from '../Combobox/icons';
import type { CollapsibleSectionProps, FoldFlagProps, FoldIds, FoldIdsOptions } from './types';
import './index.scss';

/**
 * What a folding block, a section or a variant's card, names its parts by:
 * the ids its toggle points at, its class with `is-open` and `is-invalid`,
 * and the toggle's description, its closed line while closed and its flag
 * while `flagged`. One hook, so the two folds wire their parts alike.
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
 * A section of a form as a disclosure (MB.115, the owner's calls), under an
 * `h3`, or an `h4` for a section inside one: the ingredient form's six and
 * an open variant's five, and the spell builder's When to Work It (M10.12).
 * Shared since the spell builder took it up. Its heading's text is
 * a button that opens and shuts it, with a chevron at the end of the line;
 * beneath the heading, while closed, one muted line of what has been entered,
 * and while it holds an error, a flag, open or closed. The button sits inside
 * the heading rather than a `<details>`'s `<summary>`, which is a button
 * itself and so would stop the heading being one a screen reader moves by,
 * and whose own toggle would fight the form opening a section on Save. The
 * fields stay in the page while closed, hidden, so nothing typed in them is
 * lost, and an error can still be set on them
 * (claude-docs/components/collapsible-section.md).
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
