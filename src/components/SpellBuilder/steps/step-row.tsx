'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ChevronIcon, ClearIcon, GripIcon } from '../../Combobox/icons';
import { EditIcon } from '../../IngredientForm/icons';
import { SelectField, TextField } from '../../Field';
import IconTip from '../../IconTip';
import SafetyNote, { SafetyMark } from '../../SafetyNote';
import StepRow from '../../StepRow';
import { UNIT_OPTIONS } from '../../StockFields';
import type { SpellStepValue, SpellStepsValues } from './types';
import { isInstruction, safetyOf, stepNameOf } from './values';

// One step of the jar (M10.15, M13.3): the handle it is moved by (M10.16), then
// StepRow's drawing of it with the controls around it. An ingredient's step is a
// line, open or closed like the ingredient form's variant card: closed it reads
// its amount and its instruction on one muted line beneath the name; open it shows its amount, unit and instruction (and,
// for a one-off, its form). An instruction-only step has the instruction alone. See claude-docs/components/spell-builder.md, "Steps".

const ONE_OFF_TIP = 'Used in this spell only; not kept in your cupboard.';

export interface BuilderStepRowProps {
  /** The row's field-array key, its place in the sortable list. */
  id: string;
  index: number;
  step: SpellStepValue;
  /** Whether the fields are shown. A unit that is refused opens its row whatever this says. */
  open: boolean;
  onToggle: () => void;
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

export function BuilderStepRow({
  id,
  index,
  step,
  open: openWanted,
  onToggle,
  onRemove,
}: BuilderStepRowProps): ReactElement {
  const {
    setValue,
    formState: { errors },
  } = useFormContext<SpellStepsValues>();
  const fieldsId = useId();
  // Where the Unit's error is drawn: the full width beneath the inputs (the second design review).
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
  // One muted line under a closed ingredient row, as a closed section's summary: the amount
  // then the instruction, joined by " · " (the instruction left out when blank).
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
  const handle = <StepHandle name={name} sortable={sortable} />;
  const body = (
    <TextField<SpellStepsValues>
      name={`steps.${index}.body`}
      label="Instruction"
      labelSuffix={instruction ? `Step ${index + 1}` : name}
      placeholder={instruction ? 'Light candle' : 'Add an instruction'}
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
      // Where a move has carried the row so far, translated only: a row keeps
      // its own height wherever it goes.
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
      // saving it (M10.18). A one-off has none to show: it draws nothing, not "safe".
      marks={safety && <SafetyMark {...safety} />}
      note={safety && <SafetyNote level={5} compact {...safety} />}
      badge={
        oneOff ? (
          // The badge is a button so the tip is reached by focus; its name stays One-Off and the
          // sentence is its description (IconTip's own bubble is drawn only, never read).
          <IconTip tip={ONE_OFF_TIP} placement="above" opensOnPress>
            <button
              type="button"
              className="badge badge--local step-row__one-off"
              aria-describedby={`${fieldsId}-one-off`}
            >
              One-Off
            </button>
            <span id={`${fieldsId}-one-off`} className="visually-hidden">
              {ONE_OFF_TIP}
            </span>
          </IconTip>
        ) : null
      }
      summary={
        instruction ? (
          (bodyTyped ?? '').trim() || <span className="step-row__placeholder">Write the step</span>
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
          aria-label={`${open ? 'Close' : 'Edit'} ${instruction ? `step ${index + 1}` : step.name}`}
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
          // be measured in is said at once (story 77).
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
            aria-label={instruction ? `Remove step ${index + 1}` : `Remove ${step.name}`}
            onClick={onRemove}
          >
            {/* The × a variant card's Remove is, so the row keeps its width for the name. */}
            <ClearIcon />
          </button>
        )
      }
    />
  );
}
