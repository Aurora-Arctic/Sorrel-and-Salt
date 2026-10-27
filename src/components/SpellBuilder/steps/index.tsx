'use client';

import { type ReactElement, useId, useMemo } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { StepPicker, oneOffKey } from './picker';
import { StepRow } from './step-row';
import type { SpellStepsValues } from './types';
import { derivedCategories } from './values';

// The jar's steps (M10.15): the list, the picker that adds to it, and the
// spell's derived categories, worked out from the steps as they stand so a
// Remove takes its categories off at once. The categories the spell intends
// are M10.14's, assigned; these are only ever derived (DESIGN.md §5).
// See claude-docs/components/spell-builder.md, "Steps".

export function SpellSteps({ workspaceId }: { workspaceId: string }): ReactElement {
  const { control } = useFormContext<SpellStepsValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'steps' });
  const steps = useWatch({ control, name: 'steps' });

  const taken = useMemo(
    () => new Set(steps.flatMap((step) => (step.variantId ? [step.variantId] : []))),
    [steps],
  );
  const oneOffs = useMemo(
    () =>
      new Set(
        steps.flatMap((step) =>
          step.ingredientId === null && step.name !== null ? [oneOffKey(step.name)] : [],
        ),
      ),
    [steps],
  );
  const derived = derivedCategories(steps);
  const derivedId = useId();

  return (
    <section className="spell-steps">
      <ol className="spell-steps__list" aria-label="Steps">
        {fields.map((field, index) => (
          <StepRow
            key={field.id}
            index={index}
            step={steps[index] ?? field}
            onRemove={() => remove(index)}
          />
        ))}
      </ol>
      <StepPicker workspaceId={workspaceId} taken={taken} oneOffs={oneOffs} onAdd={append} />
      <h3 className="spell-steps__heading" id={derivedId}>
        Derived Categories
      </h3>
      <ul className="spell-steps__categories" aria-labelledby={derivedId}>
        {derived.map((category) => (
          <li key={category.id}>{category.name}</li>
        ))}
      </ul>
    </section>
  );
}
