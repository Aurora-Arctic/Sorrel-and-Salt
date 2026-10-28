'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactElement } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { GripIcon } from '../../Combobox/icons';
import { SelectField, TextField } from '../../Field';
import SafetyNote, { SafetyMark } from '../../SafetyNote';
import StepRow from '../../StepRow';
import { UNIT_OPTIONS } from '../../StockFields';
import { SupplyMark } from './supply-mark';
import { supplyOf } from './supply';
import type { SpellStepValue, SpellStepsValues } from './types';
import { isInstruction, safetyOf, stepNameOf } from './values';

// One step of the jar (M10.15, M13.3): the handle it is moved by (M10.16), then
// StepRow's drawing of it with the controls around it — an ingredient's amount
// and unit, its instruction beneath, and Remove. An instruction-only step has
// the instruction alone. See claude-docs/components/spell-builder.md, "Steps".

export interface BuilderStepRowProps {
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

export function BuilderStepRow({ id, index, step, onRemove }: BuilderStepRowProps): ReactElement {
  const { setValue } = useFormContext<SpellStepsValues>();
  const sortable = useSortable({ id });
  const unit = `steps.${index}.unit` as const;
  const name = stepNameOf(step);
  const instruction = isInstruction(step);
  const safety = safetyOf(step);
  // The amount as it is typed now, so the verdict follows each keystroke (M10.19).
  const [quantity, unitChosen] = useWatch<SpellStepsValues>({
    name: [`steps.${index}.quantity`, `steps.${index}.unit`],
  }) as [string, string];
  const supply = supplyOf({
    ...step,
    quantity: quantity ?? step.quantity,
    unit: unitChosen ?? step.unit,
  });
  const handle = <StepHandle name={name} sortable={sortable} />;
  const body = (
    <TextField<SpellStepsValues>
      name={`steps.${index}.body`}
      label="Instruction"
      labelSuffix={instruction ? `Step ${index + 1}` : name}
      placeholder={instruction ? 'Light candle' : 'Crush first'}
      multiline
      rows={2}
    />
  );
  return (
    <StepRow
      rowRef={sortable.setNodeRef}
      className={['spell-step', sortable.isDragging && 'is-dragging'].filter(Boolean).join(' ')}
      // Where a move has carried the row so far, translated only: a row keeps
      // its own height wherever it goes.
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      position={index + 1}
      name={instruction ? null : name}
      icon={step.icon}
      // The care the ingredient needs, kept in view beside the step and never in the way of
      // saving it (M10.18). A one-off has none to show: it draws nothing, not "safe".
      marks={
        <>
          {safety && <SafetyMark {...safety} />}
          <SupplyMark supply={supply} />
        </>
      }
      note={safety && <SafetyNote level={5} {...safety} />}
      handle={handle}
      bodyField={body}
      quantityField={
        <TextField<SpellStepsValues>
          name={`steps.${index}.quantity`}
          label="Quantity"
          labelSuffix={name}
          type="number"
          placeholder="Amount"
          autoComplete="off"
        />
      }
      unitField={
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
      }
      actions={
        <button type="button" className="btn btn--small btn--quiet" onClick={onRemove}>
          Remove {instruction ? name : step.name}
        </button>
      }
    />
  );
}
