'use client';

import { LiveRegion, useAnnouncement } from '@dnd-kit/accessibility';
import { type ReactElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { StepPicker, oneOffKey } from './picker';
import type { QuickLookCoven } from '../step-quick-look';
import { SortableSteps } from './sortable';
import { BuilderStepRow } from './step-row';
import type { SpellStepValue, SpellStepsValues } from './types';
import { isInstruction, newInstruction, stepNameOf, warningOf } from './values';

// The jar's steps under What Goes In: the add box, Add Instruction and the list, one step open at a time, each moved by a handle
// (claude-docs/components/spell-builder.md, "Steps").

export function SpellSteps({
  workspaceId,
  look,
}: {
  workspaceId: string;
  /** The coven for each ingredient step's Quick Look; left out, the rows have none. */
  look?: QuickLookCoven;
}): ReactElement {
  const { control } = useFormContext<SpellStepsValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'steps' });
  const steps = useWatch({ control, name: 'steps' });
  // Each row's key follows its step, not its place: written back whole by an Undo, the array
  // keeps its steps' keys, where react-hook-form's own ids are all made afresh.
  const keys = useMemo(() => fields.map((field) => field.rowKey ?? field.id), [fields]);
  const names = fields.map((field, index) => stepNameOf(steps[index] ?? field));
  const { announce, announcement } = useAnnouncement();
  const regionId = useId();

  // Where focus goes once the row it names has been drawn: a new instruction's
  // field, or what is left after a Remove (the row now in that place, else the
  // Add Instruction button).
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
  const addedId = useRef<string | null>(null);
  useEffect(() => {
    if (!openNew.current) return;
    openNew.current = false;
    const id = keys[keys.length - 1] ?? null;
    addedId.current = id;
    setOpenId(id);
  }, [keys]);
  // An open row closes when a click or focus lands outside it. A just-added row stays open while
  // focus is in Add to Jar; a click on its pencil and a popover its box opened count as inside. A
  // row whose Unit is refused stays open (BuilderStepRow).
  useEffect(() => {
    if (openId === null) return;
    // The row closes when the click lands, not when the button goes down: a taller open row above
    // closing on the press moves the pencil being pressed away before the release, and that click
    // is lost. The focus a press brings is held back for the same reason.
    let pressed = false;
    const press = () => {
      pressed = true;
    };
    const release = () => {
      // The click follows the release in the same task; this runs after it.
      setTimeout(() => {
        pressed = false;
      }, 0);
    };
    const leave = (event: Event) => {
      if (event.type === 'focusin' && pressed) return;
      const target = event.target;
      if (!(target instanceof Node) || !target.isConnected) return;
      const index = keys.indexOf(openId as string);
      const row = root.current?.querySelectorAll('.spell-steps__list > li')[index];
      if (row?.contains(target)) return;
      // A click on a part of the row that cannot take the focus (a label, a gap, the padding) drops
      // the focus onto the dialog around everything: focus that fell back to a container of the row
      // has not gone anywhere else, so it is not leaving.
      if (event.type === 'focusin' && row && target.contains(row)) return;
      if (
        addedId.current === openId &&
        root.current?.querySelector('.spell-steps__box')?.contains(target)
      )
        return;
      if (target instanceof Element && target.closest('[role="listbox"]')) return;
      addedId.current = null;
      setOpenId(null);
    };
    document.addEventListener('pointerdown', press, true);
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    document.addEventListener('click', leave, true);
    document.addEventListener('focusin', leave);
    return () => {
      document.removeEventListener('pointerdown', press, true);
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', release, true);
      document.removeEventListener('click', leave, true);
      document.removeEventListener('focusin', leave);
    };
  }, [openId, keys]);
  // A new instruction takes the focus into its field once it is open and drawn: a closed
  // instruction has no field to focus.
  const focusField = useRef(false);
  useEffect(() => {
    if (!focusField.current || openId === null) return;
    focusField.current = false;
    const index = keys.indexOf(openId as string);
    root.current
      ?.querySelectorAll<HTMLElement>('.spell-steps__list > li')
      [index]?.querySelector<HTMLElement>('textarea')
      ?.focus();
  }, [openId, keys]);

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
      {/* One grid holds the list, then the add row: the box and Add Instruction, beneath the
          list where a new step lands. The button follows the
          box on a wide column and is a dashed line beneath it on a narrow one, by grid
          placement alone, so it is one button, in the one place in the markup. */}
      <div className="spell-steps__body">
        <SortableSteps ids={keys} names={names} onMove={move}>
          {fields.map((field, index) => (
            <BuilderStepRow
              key={keys[index]}
              id={keys[index]!}
              index={index}
              step={steps[index] ?? field}
              open={openId === keys[index]}
              onToggle={() => setOpenId((was) => (was === keys[index] ? null : keys[index]!))}
              onRemove={() => removeAt(index)}
              look={look}
            />
          ))}
        </SortableSteps>
        <div className="spell-steps__box">
          <StepPicker workspaceId={workspaceId} oneOffs={oneOffs} onAdd={add} />
        </div>
        <button type="button" className="btn spell-steps__add-step" onClick={addStep}>
          Add Instruction
        </button>
      </div>
      <LiveRegion id={regionId} announcement={announcement} />
    </section>
  );
}
