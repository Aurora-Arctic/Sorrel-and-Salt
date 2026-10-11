import { type ReactElement, useId } from 'react';
import { ChevronIcon } from '../Combobox/icons';
import { SectionSummary } from './summaries';
import type { CollapsibleSectionProps, SectionProps } from './types';

/**
 * A titled section of a variant's fields (MB.115, the owner's call): a small
 * heading over its fields, the sections set further apart than the fields
 * within one. Unnamed, so it is no landmark: the heading is what a screen
 * reader moves by. `labelled`, for a section whose one field's label would
 * repeat its heading, hides that label from the eye alone. A variant's
 * sections are a level beneath the Variants heading, `h4`, and drawn a step
 * smaller and closer, for the narrower card (claude-docs/components/ingredient-form.md, "Sections").
 */
export function Section({
  title,
  labelled = false,
  level = 3,
  children,
}: SectionProps): ReactElement {
  const id = useId();
  const Heading = level === 4 ? 'h4' : 'h3';
  return (
    <section
      className={labelled ? 'ingredient-form__section is-labelled' : 'ingredient-form__section'}
    >
      <Heading id={id} className="ingredient-form__section-title">
        {title}
      </Heading>
      {children}
    </section>
  );
}

/**
 * One of the ingredient's own seven sections as a disclosure (MB.115, the
 * owner's call): its heading's text is a button that opens and shuts it, with
 * a chevron at the end of the line; beneath the heading, while closed, one
 * muted line of what has been entered, and while it holds an error, a flag,
 * open or closed. The button sits inside the heading rather than a
 * `<details>`'s `<summary>`, which is a button itself and so would stop the
 * heading being one a screen reader moves by, and whose own toggle would fight
 * the form opening a section on Save. The fields stay in the page while
 * closed, hidden, so nothing typed in them is lost, and an error can still be
 * set on them (claude-docs/components/ingredient-form.md, "Sections").
 */
export function CollapsibleSection({
  title,
  section,
  fold: { open, invalid, onToggle },
  labelled = false,
  info,
  titleId,
  children,
}: CollapsibleSectionProps): ReactElement {
  const id = useId();
  const summaryId = `${id}-summary`;
  const flagId = `${id}-flag`;
  const fieldsId = `${id}-fields`;
  return (
    <section
      className={['ingredient-form__fold', open && 'is-open', invalid && 'is-invalid']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="ingredient-form__fold-head">
        <div className="ingredient-form__fold-line">
          <h3 className="ingredient-form__section-title">
            <button
              id={titleId}
              type="button"
              className="ingredient-form__fold-toggle"
              aria-expanded={open}
              aria-controls={fieldsId}
              aria-describedby={
                [!open && summaryId, invalid && flagId].filter(Boolean).join(' ') || undefined
              }
              onClick={onToggle}
            >
              {title}
            </button>
          </h3>
          {info}
          {/* Drawn only: the whole line is the button's, through its overlay. */}
          <span className="ingredient-form__fold-chevron" aria-hidden="true">
            <ChevronIcon />
          </span>
        </div>
        <span id={summaryId} className="ingredient-form__fold-summary" hidden={open}>
          <SectionSummary section={section} />
        </span>
        {invalid && (
          <span id={flagId} className="ingredient-form__fold-flag">
            Has an error to fix
          </span>
        )}
      </div>
      <div
        id={fieldsId}
        className={
          labelled ? 'ingredient-form__fold-fields is-labelled' : 'ingredient-form__fold-fields'
        }
        hidden={!open}
      >
        {children}
      </div>
    </section>
  );
}
