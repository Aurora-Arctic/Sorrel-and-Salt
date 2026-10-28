'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactElement } from 'react';
import { useFormContext } from 'react-hook-form';
import { GripIcon } from '../../Combobox/icons';
import { SelectField, TextField } from '../../Field';
import FormIcon from '../../FormIcon';
import { UNIT_OPTIONS } from '../../StockFields';
import type { SpellStepValue, SpellStepsValues } from './types';
import { stepNameOf } from './values';

// One step of the jar (M10.15): what it lays, with its form's icon, its
// amount, and Remove. An instruction step, which M13.3 writes, shows its text
// and is kept as it is. Every step leads with the handle it is moved by
// (M10.16), an instruction's too. See claude-docs/components/spell-builder.md, "Steps".

export interface StepRowProps {
  /** The row's field-array key, its place in the sortable list. */
  id: string;
  index: number;
  step: SpellStepValue;
  onRemove: () => void;
}

/**
 * The button a step is moved by: dnd-kit's attributes give it a button's
 * role, which it has already, and the instructions as its description.
 */
function StepHandle({
  name,
  sortable,
}: {
  name: string;
  sortable: ReturnType<typeof useSortable>;
}): ReactElement {
  const { setActivatorNodeRef, listeners, attributes } = sortable;
  const { role: _role, ...rest } = attributes;
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="spell-step__handle"
      {...rest}
      {...listeners}
      aria-label={`Move ${name}`}
    >
      <GripIcon />
    </button>
  );
}

export function StepRow({ id, index, step, onRemove }: StepRowProps): ReactElement {
  const { setValue } = useFormContext<SpellStepsValues>();
  const sortable = useSortable({ id });
  const unit = `steps.${index}.unit` as const;
  const name = stepNameOf(step);
  const row = {
    ref: sortable.setNodeRef,
    className: ['spell-step', sortable.isDragging && 'is-dragging'].filter(Boolean).join(' '),
    // Where a move has carried the row so far, translated only: a row keeps
    // its own height wherever it goes.
    style: {
      transform: CSS.Translate.toString(sortable.transform),
      transition: sortable.transition,
    },
  };

  if (step.name === null) {
    return (
      <li {...row}>
        <StepHandle name={name} sortable={sortable} />
        <p className="spell-step__body">{step.body}</p>
      </li>
    );
  }
  return (
    <li {...row}>
      <StepHandle name={name} sortable={sortable} />
      <p className="spell-step__name">
        {/* The generic spoon for a one-off, which names no form group. */}
        <FormIcon name={step.icon} />
        {name}
      </p>
      <TextField<SpellStepsValues>
        name={`steps.${index}.quantity`}
        label="Quantity"
        labelSuffix={name}
        type="number"
        placeholder="Amount"
        autoComplete="off"
      />
      <SelectField<SpellStepsValues>
        name={unit}
        label="Unit"
        labelSuffix={name}
        options={UNIT_OPTIONS}
        // Checked as it is chosen, not when it is left: a unit the jar cannot
        // be measured in is said at once (story 77).
        onChange={(value) =>
          setValue(unit, value, { shouldTouch: true, shouldDirty: true, shouldValidate: true })
        }
      />
      <button type="button" className="btn btn--small btn--quiet" onClick={onRemove}>
        Remove {step.name}
      </button>
    </li>
  );
}
