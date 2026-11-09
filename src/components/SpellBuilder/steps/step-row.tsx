'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ChevronIcon, CrossIcon } from '../../IconTip/icons';
import { EditIcon } from '../../IngredientForm/icons';
import { SelectField, TextField } from '../../Field';
import GripHandle from '../../GripHandle';
import SafetyNote, { SafetyMark } from '../../SafetyNote';
import StepRow from '../../StepRow';
import OneOffBadge from '../../StepRow/one-off-badge';
import { UNIT_OPTIONS } from '../../StockFields';
import type { SpellStepValue, SpellStepsValues } from './types';
import { type QuickLookCoven, StepQuickLook } from '../step-quick-look';
import { isInstruction, safetyOf, stepNameOf } from './values';

// One step of the jar: its drag handle, then StepRow's drawing with the controls around it. Closed
// it reads amount and instruction on one muted line; open it shows amount, unit, instruction and,
// for a one-off, form (claude-docs/components/spell-builder.md, "Steps").

export interface BuilderStepRowProps {
  id: string;
  index: number;
  step: SpellStepValue;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
  look?: QuickLookCoven;
}

export function BuilderStepRow({
  id,
  index,
  step,
  open: openWanted,
  onToggle,
  onRemove,
  look,
}: BuilderStepRowProps): ReactElement {
  const {
    setValue,
    formState: { errors },
  } = useFormContext<SpellStepsValues>();
  const fieldsId = useId();
  const [errorNode, setErrorNode] = useState<HTMLElement | null>(null);
  const focusOnOpen = useRef(false);
  const sortable = useSortable({ id });
  const unit = `steps.${index}.unit` as const;
  const name = stepNameOf(step);
  const instruction = isInstruction(step);
  const safety = safetyOf(step);
  // The amount and instruction as they are typed now, so the closed line follows them.
  const [quantity, unitChosen, bodyTyped] = useWatch<SpellStepsValues>({
    name: [`steps.${index}.quantity`, `steps.${index}.unit`, `steps.${index}.body`],
  }) as [string | undefined, string | undefined, string | null | undefined];
  // A unit the jar cannot be measured in is said on the Unit field, so its row is open.
  // An instruction refused as blank is said at its own field, so that row is open too.
  const open =
    openWanted ||
    errors.steps?.[index]?.unit !== undefined ||
    (isInstruction(step) && errors.steps?.[index]?.body !== undefined) ||
    errors.steps?.[index]?.name !== undefined;
  const oneOff = !instruction && step.ingredientId === null;
  const amountLine = [quantity, unitChosen].filter(Boolean).join(' ');
  const bodyLine = (bodyTyped ?? '').trim();
  // Opening by the pencil takes the focus to the first field, as a variant card's Edit does.
  const row = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    row.current
      ?.querySelector<HTMLElement>(
        '.step-row__open input, .step-row__open textarea, .step-row__field textarea',
      )
      ?.focus();
  }, [open]);
  const handle = <GripHandle sortable={sortable} name={name} className="spell-step__handle" />;
  const body = (
    <TextField<SpellStepsValues>
      name={`steps.${index}.body`}
      label="Instruction"
      labelSuffix={instruction ? `Step ${index + 1}` : name}
      placeholder="Add an instruction"
      multiline
      rows={2}
    />
  );
  return (
    <StepRow
      onToggle={() => {
        focusOnOpen.current = !open;
        onToggle();
      }}
      rowRef={(node) => {
        row.current = node;
        sortable.setNodeRef(node);
      }}
      className={[
        'spell-step',
        'step-row--card',
        instruction && 'step-row--instruction',
        sortable.isDragging && 'is-dragging',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      open={open}
      fieldsId={fieldsId}
      position={index + 1}
      name={instruction ? null : name}
      icon={step.icon}
      // The care the ingredient needs, kept in view beside the step and never in the way of
      // saving it, open or closed: open, the note below adds its words. A one-off has none to
      // show: it draws nothing, not "safe".
      marks={safety && <SafetyMark {...safety} />}
      look={
        look && !instruction && step.ingredientId !== null ? (
          // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- this only stops a click reaching the row; it is not a control
          <span onClick={(event) => event.stopPropagation()}>
            <StepQuickLook ingredientId={step.ingredientId} name={name} look={look} />
          </span>
        ) : null
      }
      note={safety && <SafetyNote level={5} compact {...safety} />}
      badge={oneOff ? <OneOffBadge /> : null}
      summary={
        instruction ? (
          (bodyTyped ?? '').trim() || (
            <span className="step-row__placeholder">Add an instruction</span>
          )
        ) : amountLine || bodyLine ? (
          // The amount never shrinks; only the instruction's tail is cut by the ellipsis.
          <span className="step-row__line">
            {amountLine && (
              <span className="step-row__line-amount">
                {bodyLine ? `${amountLine} · ` : amountLine}
              </span>
            )}
            {bodyLine && <span className="step-row__line-body">{bodyLine}</span>}
          </span>
        ) : null
      }
      edit={
        <button
          type="button"
          // One disclosure button in one place (second design review): the pencil while the row is
          // closed, the up chevron, light, once it is open. It keeps the focus when it flips.
          className={['step-row__edit', open && 'step-row__edit--close'].filter(Boolean).join(' ')}
          aria-label={`${open ? 'Close' : 'Edit'} ${name}`}
          aria-expanded={open}
          aria-controls={fieldsId}
          onClick={() => {
            focusOnOpen.current = !open;
            onToggle();
          }}
        >
          {open ? <ChevronIcon /> : <EditIcon />}
        </button>
      }
      nameField={
        oneOff ? (
          <TextField<SpellStepsValues>
            name={`steps.${index}.name`}
            label="Name"
            required
            placeholder="Add a name"
            autoComplete="off"
          />
        ) : null
      }
      formField={
        oneOff ? (
          <TextField<SpellStepsValues>
            name={`steps.${index}.form`}
            label="Form"
            labelSuffix={step.name ?? undefined}
            placeholder="Add a form"
            autoComplete="off"
          />
        ) : null
      }
      errorRef={setErrorNode}
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
          errorInto={errorNode}
          // Checked as it is chosen, not when it is left: a unit the jar cannot
          // be measured in is said at once.
          onChange={(value) =>
            setValue(unit, value, { shouldTouch: true, shouldDirty: true, shouldValidate: true })
          }
        />
      }
      actions={
        // Remove is for a closed row, so a row being edited is never deleted by a stray press.
        open ? null : (
          <button
            type="button"
            className="step-row__remove"
            aria-label={`Remove ${name}`}
            onClick={onRemove}
          >
            {/* The × a variant card's Remove is, so the row keeps its width for the name. */}
            <CrossIcon />
          </button>
        )
      }
    />
  );
}
