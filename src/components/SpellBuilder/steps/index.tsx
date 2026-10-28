'use client';

import { LiveRegion, useAnnouncement } from '@dnd-kit/accessibility';
import { type ReactElement, useEffect, useId, useMemo, useRef } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { StepPicker, oneOffKey } from './picker';
import { SortableSteps } from './sortable';
import { BuilderStepRow } from './step-row';
import type { SpellStepValue, SpellStepsValues } from './types';
import { derivedCategories, newInstruction, stepNameOf } from './values';

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

  // Where focus goes once the row it names has been drawn: a new instruction's
  // field, or what is left after a Remove (the row now in that place, else the
  // Add a Step button).
  const root = useRef<HTMLElement>(null);
  const focusAfter = useRef<{ index: number; target: 'field' | 'handle' } | null>(null);
  useEffect(() => {
    const next = focusAfter.current;
    if (next === null) return;
    focusAfter.current = null;
    const row = root.current?.querySelectorAll<HTMLElement>('.spell-steps__list > li')[next.index];
    const target =
      next.target === 'field'
        ? row?.querySelector<HTMLElement>('textarea')
        : (row?.querySelector<HTMLElement>('.spell-step__handle') ??
          root.current?.querySelector<HTMLElement>('.spell-steps__add-step'));
    target?.focus();
  }, [fields.length]);

  const add = (step: SpellStepValue) => {
    append(step, { shouldFocus: false });
    const count = fields.length + 1;
    announce(`Added ${stepNameOf(step)}, at position ${count} of ${count}.`);
  };
  const removeAt = (index: number) => {
    announce(`Removed ${names[index]}, from position ${index + 1} of ${fields.length}.`);
    focusAfter.current = { index: Math.min(index, fields.length - 2), target: 'handle' };
    remove(index);
  };

  const addStep = () => {
    focusAfter.current = { index: fields.length, target: 'field' };
    add(newInstruction());
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
    <section className="spell-steps" ref={root}>
      <SortableSteps ids={fields.map((field) => field.id)} names={names} onMove={move}>
        {fields.map((field, index) => (
          <BuilderStepRow
            key={field.id}
            id={field.id}
            index={index}
            step={steps[index] ?? field}
            onRemove={() => removeAt(index)}
          />
        ))}
      </SortableSteps>
      <LiveRegion id={regionId} announcement={announcement} />
      <button type="button" className="btn btn--small spell-steps__add-step" onClick={addStep}>
        Add a Step
      </button>
      <StepPicker workspaceId={workspaceId} taken={taken} oneOffs={oneOffs} onAdd={add} />
      {/* h4: the jar sits in the builder's Jar section, whose heading is an h3. */}
      <h4 className="spell-steps__heading" id={derivedId}>
        Derived Categories
      </h4>
      <ul className="spell-steps__categories" aria-labelledby={derivedId}>
        {derived.map((category) => (
          <li key={category.id}>{category.name}</li>
        ))}
      </ul>
    </section>
  );
}
