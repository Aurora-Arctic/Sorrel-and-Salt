'use client';

import { LiveRegion, useAnnouncement } from '@dnd-kit/accessibility';
import { type ReactElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { StepPicker, oneOffKey } from './picker';
import { SortableSteps } from './sortable';
import { BuilderStepRow } from './step-row';
import type { SpellStepValue, SpellStepsValues } from './types';
import { isInstruction, newInstruction, stepNameOf, warningOf } from './values';

// The jar's steps (M10.15): the box that adds to them, the Add a Step button
// and the list, under the heading What Goes In. The steps are moved by a handle
// each (M10.16), and an Add or a Remove is said in a live region of its own,
// as a move is said in dnd-kit's. One step is open at a time, the newest at
// once; the rest are a line each. What the jar holds and the spell's intent set
// against it are the aside's (inventory.tsx, comparison-panel.tsx).
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
  const focusAfter = useRef<{ index: number; target: 'handle' } | null>(null);
  useEffect(() => {
    const next = focusAfter.current;
    if (next === null) return;
    focusAfter.current = null;
    const row = root.current?.querySelectorAll<HTMLElement>('.spell-steps__list > li')[next.index];
    const target =
      row?.querySelector<HTMLElement>('.spell-step__handle') ??
      root.current?.querySelector<HTMLElement>('.spell-steps__add-step');
    target?.focus();
  }, [fields.length]);

  // The step added since the last render opens at once, its field-array key being
  // known only once the row is drawn.
  const [openId, setOpenId] = useState<string | null>(null);
  const openNew = useRef(false);
  useEffect(() => {
    if (!openNew.current) return;
    openNew.current = false;
    setOpenId(fields[fields.length - 1]?.id ?? null);
  }, [fields]);
  // A new instruction takes the focus into its field once it is open and drawn: a closed
  // instruction has no field to focus.
  const focusField = useRef(false);
  useEffect(() => {
    if (!focusField.current || openId === null) return;
    focusField.current = false;
    const index = fields.findIndex((field) => field.id === openId);
    root.current
      ?.querySelectorAll<HTMLElement>('.spell-steps__list > li')
      [index]?.querySelector<HTMLElement>('textarea')
      ?.focus();
  }, [openId, fields]);

  const add = (step: SpellStepValue) => {
    openNew.current = true;
    // The focus stays in Add to Jar for the next ingredient: react-hook-form
    // would move it to the new step's Quantity a render later, closing the
    // list of whatever was typed in the meantime.
    append(step, { shouldFocus: false });
    const count = fields.length + 1;
    announce(
      [`Added ${stepNameOf(step)}, at position ${count} of ${count}.`, warningOf(step)]
        .filter(Boolean)
        .join(' '),
    );
  };
  const removeAt = (index: number) => {
    announce(`Removed ${names[index]}, from position ${index + 1} of ${fields.length}.`);
    focusAfter.current = { index: Math.min(index, fields.length - 2), target: 'handle' };
    remove(index);
  };

  const addStep = () => {
    focusField.current = true;
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
  const headingId = useId();
  const ingredients = steps.filter((step) => !isInstruction(step)).length;
  const counts = [
    `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`,
    `${ingredients} ${ingredients === 1 ? 'ingredient' : 'ingredients'}`,
  ].join(' · ');

  return (
    <section className="spell-steps" ref={root} aria-labelledby={headingId}>
      <div className="spell-steps__head">
        {/* h4: the jar sits in the builder's Jar section, whose heading is an h3. */}
        <h4 className="spell-steps__heading" id={headingId}>
          What Goes In
        </h4>
        {steps.length > 0 && <p className="spell-steps__summary">{counts}</p>}
      </div>
      {/* One grid holds the box, Add a Step and the list: the button follows the box on a
          wide column and is the list's last line on a narrow one, by `order` alone, so it
          is one button, in the one place in the markup. */}
      <div className="spell-steps__body">
        <div className="spell-steps__box">
          <StepPicker workspaceId={workspaceId} taken={taken} oneOffs={oneOffs} onAdd={add} />
        </div>
        <button type="button" className="btn spell-steps__add-step" onClick={addStep}>
          <span className="spell-steps__next" aria-hidden="true">
            {fields.length + 1}.
          </span>
          Add a Step
        </button>
        <SortableSteps ids={fields.map((field) => field.id)} names={names} onMove={move}>
          {fields.map((field, index) => (
            <BuilderStepRow
              key={field.id}
              id={field.id}
              index={index}
              step={steps[index] ?? field}
              open={openId === field.id}
              onToggle={() => setOpenId((was) => (was === field.id ? null : field.id))}
              onRemove={() => removeAt(index)}
            />
          ))}
        </SortableSteps>
      </div>
      <LiveRegion id={regionId} announcement={announcement} />
    </section>
  );
}
