'use client';

import { formLabel } from '@/modules/ingredients/validation/form-label';

import { Fragment, type ReactElement, type ReactNode, useId, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { chipColors } from '../../../lib/chip-colors';
import type { GroupColors } from '../../../lib/types';
import { compareJar } from '../comparison-panel';
import { useCategoryColors, useCategoryNames } from '../category-colors';
import type { SpellBuilderValues } from '../types';
import type { SpellIngredientSuggestionsQuery } from '../../../gql/graphql';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import Combobox from '../../Combobox';
import { FieldError } from '../../Field';
import FormIcon from '../../FormIcon';
import { useLookup } from '../../IngredientForm/suggestions';
import { COMPENDIUM_HEADING, YOUR_INGREDIENTS } from '../../IngredientForm/values';
import { SpellIngredientSuggestionsDocument } from './documents';
import type { IngredientPickOption, SpellStepValue } from './types';
import { jarOf, jarUnitOf, newStep } from './values';

// Add to Jar (M10.15, story 49): one box, the type-ahead over the coven's ingredients
// and the compendium's, one row per form, since a step lays a form. Its first row
// offers what was typed as a one-off ingredient, written for this jar alone, which
// makes no ingredient; the form and amount are typed in the opened row.
// See claude-docs/components/spell-builder.md, "Steps".

export interface StepPickerProps {
  workspaceId: string;
  /** The one-off names already in the jar, case and spaces aside. */
  oneOffs: ReadonlySet<string>;
  onAdd: (step: SpellStepValue) => void;
}

const ONE_OFF_TAKEN = 'This ingredient is already in the jar';

/** A one-off's name as the jar compares it: case and outer spaces aside. */
export const oneOffKey = (name: string): string => name.trim().toLocaleLowerCase();

/** How many of a row's categories are drawn before the rest fold into a "+N" chip. */
export const ROW_CATEGORY_CAP = 1;

/**
 * A row's categories in three runs: the spell's assigned categories that Category Match counts
 * Missing (none of the jar's steps carries them yet), then its other assigned ones (Carried),
 * then the rest. Stable, so each run keeps the order the server sent.
 */
const assignedFirst = <T extends { id: string }>(
  categories: readonly T[],
  assigned: ReadonlySet<string>,
  missing: ReadonlySet<string>,
): T[] => [
  ...categories.filter(({ id }) => missing.has(id)),
  ...categories.filter(({ id }) => assigned.has(id) && !missing.has(id)),
  ...categories.filter(({ id }) => !assigned.has(id)),
];

/**
 * The categories as small print on a row: each in its group's chip colours, as CategoryChips
 * draws them, plain text until the colours land or for a category without a group. The first
 * `ROW_CATEGORY_CAP` are drawn and the rest fold into a neutral "+N" chip rather than an
 * ellipsis, a fixed count because a measured fit would need the row's laid-out width. The folded
 * names stay in the row's accessible name, as visually hidden text inside the chip, and show on
 * hover as the chip's `title` (a focusable tooltip button would take over the option's role).
 */
const categoryNames = (
  categories: readonly { id: string; name: string }[],
  colors: ReadonlyMap<string, GroupColors>,
  assigned: ReadonlySet<string>,
  missing: ReadonlySet<string>,
): ReactNode => {
  if (categories.length === 0) return undefined;
  const ordered = assignedFirst(categories, assigned, missing);
  const shown = ordered.slice(0, ROW_CATEGORY_CAP);
  const hidden = ordered.slice(ROW_CATEGORY_CAP);
  return (
    <>
      {shown.map(({ id, name }, index) => {
        const pair = colors.get(id);
        return (
          <Fragment key={id}>
            {index > 0 && ' · '}
            {pair ? (
              <span className="chip" style={chipColors(pair)}>
                {name}
              </span>
            ) : (
              name
            )}
          </Fragment>
        );
      })}
      {hidden.length > 0 && (
        <>
          {' · '}
          <span className="chip chip--more" title={hidden.map(({ name }) => name).join(', ')}>
            +{hidden.length}
            <span className="visually-hidden">
              {' '}
              more: {hidden.map(({ name }) => name).join(', ')}
            </span>
          </span>
        </>
      )}
    </>
  );
};

/** Every live form of every live ingredient found, under the heading of where it came from. */
function pickRows(
  data: SpellIngredientSuggestionsQuery,
  colors: ReadonlyMap<string, GroupColors>,
  assigned: ReadonlySet<string>,
  missing: ReadonlySet<string>,
): IngredientPickOption[] {
  return data.ingredientSuggestions.edges.flatMap(({ group, node }) =>
    // A retired entry is kept where a spell lays it, never added anew.
    node.retired
      ? []
      : node.variants.map(({ form, ...variant }) => {
          const name = node.cupboardEntry?.label ?? node.name;
          const icon = (variant.formChoice?.group.icon ?? null) as FormGroupIcon | null;
          return {
            value: name,
            label: `${name} (${formLabel(form)})`,
            note: node.canonicalName ?? undefined,
            // The form's categories, else the ingredient's, as small print on that line.
            meta: categoryNames(
              variant.categories.length > 0 ? variant.categories : node.categories,
              colors,
              assigned,
              missing,
            ),
            heading: group === 'yours' ? YOUR_INGREDIENTS : COMPENDIUM_HEADING,
            key: variant.id,
            icon: <FormIcon name={icon} />,
            step: newStep({
              ingredientId: node.id,
              variantId: variant.id,
              name: node.name,
              form,
              icon,
              categories: [...node.categories, ...variant.categories],
              safety: {
                toxic: node.toxic,
                safetyNotes: node.safetyNotes ?? null,
                formToxic: variant.toxic,
                formSafetyNotes: variant.safetyNotes ?? null,
              },
              jarUnit: jarUnitOf(node.stock, variant.id),
              jar: jarOf(node.stock, variant.id),
            }),
          };
        }),
  );
}

export function StepPicker({ workspaceId, oneOffs, onAdd }: StepPickerProps): ReactElement {
  const id = useId();
  const [text, setText] = useState('');
  const [active, setActive] = useState(false);
  const [refused, setRefused] = useState(false);
  const colors = useCategoryColors();
  const names = useCategoryNames();
  const { control } = useFormContext<SpellBuilderValues>();
  const assignedIds = useWatch({ control, name: 'categoryIds' });
  const assigned = useMemo(() => new Set(assignedIds ?? []), [assignedIds]);
  // Category Match's Missing: assigned, and carried by no step in the jar yet.
  const jarSteps = useWatch({ control, name: 'steps' });
  const missing = useMemo(
    () => new Set(compareJar([...assigned], jarSteps ?? []).intendedNotPresent),
    [assigned, jarSteps],
  );
  // The assigned categories pressed to narrow the results. One that is no longer assigned
  // drops out of the filter, so removing it from the field never leaves a hidden filter.
  const [pressed, setPressed] = useState<readonly string[]>([]);
  const narrowedBy = useMemo(() => pressed.filter((id) => assigned.has(id)), [pressed, assigned]);
  const shape = useMemo(
    () => (data: SpellIngredientSuggestionsQuery) => pickRows(data, colors, assigned, missing),
    [colors, assigned, missing],
  );
  const suggestions = useLookup(
    SpellIngredientSuggestionsDocument,
    { workspaceId, categoryIds: narrowedBy },
    text,
    active,
    shape,
  );

  const typed = text.trim();
  // The first row is offered for text no row already reads as, as a typed row is.
  const offerOneOff = useMemo(
    () =>
      typed !== '' &&
      !suggestions.options.some(
        (option) => (option.label ?? option.value).trim().toLocaleLowerCase() === oneOffKey(typed),
      ),
    [typed, suggestions.options],
  );
  const addOneOff = () => {
    if (oneOffs.has(oneOffKey(typed))) {
      setRefused(true);
      return;
    }
    onAdd(
      newStep({
        ingredientId: null,
        variantId: null,
        name: typed,
        form: null,
        icon: null,
        categories: [],
        safety: null,
        jarUnit: null,
        jar: null,
      }),
    );
    setText('');
  };

  return (
    <div className="field">
      {/* Above the box, since an open list covers whatever is beneath it. Each is a toggle:
          none pressed is no filter, one or more keeps ingredients carrying any of them. */}
      {assigned.size > 0 && (
        <div role="group" aria-label="Filter by category" className="spell-steps__filter">
          {[...assigned].flatMap((categoryId) => {
            const name = names.get(categoryId);
            if (name === undefined) return [];
            const on = narrowedBy.includes(categoryId);
            const pair = colors.get(categoryId);
            return [
              <button
                key={categoryId}
                type="button"
                className="chip spell-steps__filter-chip"
                style={pair ? chipColors(pair) : undefined}
                aria-pressed={on}
                onClick={() =>
                  setPressed(
                    on ? narrowedBy.filter((id) => id !== categoryId) : [...narrowedBy, categoryId],
                  )
                }
              >
                {name}
              </button>,
            ];
          })}
        </div>
      )}
      <Combobox<IngredientPickOption>
        id={`${id}-search`}
        label="Add to Jar"
        value={text}
        onChange={(value) => {
          setText(value);
          setRefused(false);
        }}
        onFocus={() => setActive(true)}
        onPick={(_, option) => {
          if (option === null || option.disabled) return;
          onAdd(option.step);
          setText('');
        }}
        suggestions={suggestions}
        action={
          offerOneOff
            ? { label: `Add "${typed}" as a one-off ingredient`, onSelect: addOneOff }
            : undefined
        }
        toggle={false}
        offerTyped={false}
        actionFirst
        noun="ingredient"
        placeholder="Add an ingredient or search"
        aria-invalid={refused || undefined}
        aria-describedby={refused ? `${id}-error` : undefined}
      />
      <FieldError id={`${id}-error`} message={refused ? ONE_OFF_TAKEN : undefined} />
    </div>
  );
}
