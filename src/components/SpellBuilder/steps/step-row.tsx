'use client';

import { formLabel } from '@/modules/ingredients/validation/form-label';

import type { ReactElement } from 'react';
import { useFormContext } from 'react-hook-form';
import { SelectField, TextField } from '../../Field';
import FormIcon from '../../FormIcon';
import { UNIT_OPTIONS } from '../../StockFields';
import type { SpellStepValue, SpellStepsValues } from './types';

// One step of the jar (M10.15): what it lays, with its form's icon, its
// amount, and Remove. An instruction step, which M13.3 writes, shows its text
// and is kept as it is. See claude-docs/components/spell-builder.md, "Steps".

export interface StepRowProps {
  index: number;
  step: SpellStepValue;
  onRemove: () => void;
}

/** "Fixture Rosewort", or with its form, "Fixture Rosewort (Dried Leaf)". */
const nameOf = ({ name, form }: SpellStepValue): string =>
  form ? `${name ?? ''} (${formLabel(form)})` : (name ?? '');

export function StepRow({ index, step, onRemove }: StepRowProps): ReactElement {
  const { setValue } = useFormContext<SpellStepsValues>();
  const unit = `steps.${index}.unit` as const;

  if (step.name === null) {
    return (
      <li className="spell-step">
        <p className="spell-step__body">{step.body}</p>
      </li>
    );
  }
  const name = nameOf(step);
  return (
    <li className="spell-step">
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
