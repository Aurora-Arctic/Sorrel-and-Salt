import { type ReactElement, useId } from 'react';
import type { SectionProps } from './types';

/**
 * One of the form's titled sections (MB.115, the owner's call): a small
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
