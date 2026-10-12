import { type ReactElement, type ReactNode, useId } from 'react';
import { ChevronIcon } from '../Combobox/icons';
import { SectionSummary } from './summaries';
import type { CollapsibleSectionProps, FoldFlagProps, FoldIds, FoldIdsOptions } from './types';

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
 * A section of the form as a disclosure (MB.115, the owner's calls): one of
 * the ingredient's own six, under an `h3`, or one of an open variant's five,
 * a level beneath the Variants heading, under an `h4`. Its heading's text is
 * a button that opens and shuts it, with a chevron at the end of the line;
 * beneath the heading, while closed, one muted line of what has been entered,
 * and while it holds an error, a flag, open or closed. The button sits inside
 * the heading rather than a `<details>`'s `<summary>`, which is a button
 * itself and so would stop the heading being one a screen reader moves by,
 * and whose own toggle would fight the form opening a section on Save. The
 * fields stay in the page while closed, hidden, so nothing typed in them is
 * lost, and an error can still be set on them
 * (claude-docs/components/ingredient-form.md, "Sections").
 */
export function CollapsibleSection({
  title,
  section,
  summary,
  fold: { open, invalid, onToggle },
  level = 3,
  info,
  titleId,
  children,
}: CollapsibleSectionProps): ReactElement {
  // Flagged open or closed: the heading stays in view either way.
  const { summaryId, flagId, fieldsId, className, describedBy } = useFoldIds({
    block: 'ingredient-form__fold',
    open,
    invalid,
    flagged: invalid,
  });
  const Heading = level === 4 ? 'h4' : 'h3';
  return (
    <section className={className}>
      <div className="ingredient-form__fold-head">
        <div className="ingredient-form__fold-line">
          <Heading className="ingredient-form__section-title">
            <button
              id={titleId}
              type="button"
              className="ingredient-form__fold-toggle"
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
          <span className="ingredient-form__fold-chevron" aria-hidden="true">
            <ChevronIcon />
          </span>
        </div>
        <span id={summaryId} className="ingredient-form__fold-summary" hidden={open}>
          {section === undefined ? summary : <SectionSummary section={section} />}
        </span>
        <FoldFlag id={flagId} className="ingredient-form__fold-flag" shown={invalid} />
      </div>
      <div id={fieldsId} className="ingredient-form__fold-fields" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
