'use client';

import { LiveRegion, useAnnouncement } from '@dnd-kit/accessibility';
import { type ReactElement, useId, useMemo } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { StepPicker, oneOffKey } from './picker';
import { SortableSteps } from './sortable';
import { StepRow } from './step-row';
import type { SpellStepValue, SpellStepsValues } from './types';
import { derivedCategories, stepNameOf } from './values';

// The jar's steps (M10.15): the list, the picker that adds to it, and the
// spell's derived categories, worked out from the steps as they stand so a
// Remove takes its categories off at once. The steps are moved by a handle
// each (M10.16), and an Add or a Remove is said in a live region of its own,
// as a move is said in dnd-kit's. The categories the spell intends
// are M10.14's, assigned; these are only ever derived (DESIGN.md §5).
// See claude-docs/components/spell-builder.md, "Steps".

export function SpellSteps({ workspaceId }: { workspaceId: string }): ReactElement {
  const { control } = useFormContext<SpellStepsValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'steps' });
  const steps = useWatch({ control, name: 'steps' });
  const names = fields.map((field, index) => stepNameOf(steps[index] ?? field));
  const { announce, announcement } = useAnnouncement();
  const regionId = useId();

  const add = (step: SpellStepValue) => {
    append(step);
    const count = fields.length + 1;
    announce(`Added ${stepNameOf(step)}, at position ${count} of ${count}.`);
  };
  const removeAt = (index: number) => {
    announce(`Removed ${names[index]}, from position ${index + 1} of ${fields.length}.`);
    remove(index);
  };

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
      <SortableSteps ids={fields.map((field) => field.id)} names={names} onMove={move}>
        {fields.map((field, index) => (
          <StepRow
            key={field.id}
            id={field.id}
            index={index}
            step={steps[index] ?? field}
            onRemove={() => removeAt(index)}
          />
        ))}
      </SortableSteps>
      <LiveRegion id={regionId} announcement={announcement} />
      <StepPicker workspaceId={workspaceId} taken={taken} oneOffs={oneOffs} onAdd={add} />
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
