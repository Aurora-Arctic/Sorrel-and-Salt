'use client';

import { formLabel } from '@/modules/ingredients/validation/form-label';

import { type ReactElement, type ReactNode, useId, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { chipColors } from '../../../lib/chip-colors';
import type { GroupColors } from '../../../lib/types';
import { compareJar } from '../comparison-panel';
import { useCategoryIndex } from '../category-index';
import type { SpellBuilderValues } from '../types';
import type { SpellIngredientSuggestionsQuery } from '../../../gql/graphql';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import Combobox from '../../Combobox';
import CategoryChips from '../../CategoryChips';
import { FieldShell, fieldDescription } from '../../Field';
import FormIcon from '../../FormIcon';
import { CheckIcon } from '../../IconTip';
import { useLookup } from '../../IngredientForm/suggestions';
import { COMPENDIUM_HEADING, YOUR_INGREDIENTS } from '../../IngredientForm/values';
import { SpellIngredientSuggestionsDocument } from './documents';
import type { IngredientPickOption, SpellStepValue } from './types';
import { jarOf, jarUnitOf, newStep } from './values';

// Add to Jar: one type-ahead over the coven's ingredients and the compendium's, a row per form. Its
// first row offers the typed text as a one-off ingredient for this jar alone
// (claude-docs/components/spell-builder.md, "Steps").

export interface StepPickerProps {
  workspaceId: string;
  /** The one-off names already in the jar, case and spaces aside. */
  oneOffs: ReadonlySet<string>;
  onAdd: (step: SpellStepValue) => void;
}

const PICKER_HINT = 'Type to search your ingredients and the compendium.';
const ONE_OFF_TAKEN = 'This ingredient is already in the jar.';

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
 * The chip colours of a category whose group has not loaded (or has none): the theme's muted text
 * token, which is already the right grey in each theme.
 */
const NEUTRAL: GroupColors = { colorDark: 'var(--text-muted)', colorLight: 'var(--text-muted)' };

/**
 * The categories as small print on a row, drawn by CategoryChips (compact size, group colours)
 * so the "+N" is the same CategoryMore button and floating panel the cards and the admin table
 * have. The first `ROW_CATEGORY_CAP` show; the rest fold behind it. The click and press are
 * kept from the option, so using the chips never picks the row or closes the list.
 */
const categoryNames = (
  name: string,
  categories: readonly { id: string; name: string }[],
  colors: ReadonlyMap<string, GroupColors>,
  assigned: ReadonlySet<string>,
  missing: ReadonlySet<string>,
): ReactNode => {
  if (categories.length === 0) return undefined;
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- only stops a pointer reaching the option
    <span
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.preventDefault()}
    >
      <CategoryChips
        compact
        label={name}
        limit={ROW_CATEGORY_CAP}
        categories={assignedFirst(categories, assigned, missing).map(
          ({ id, name: categoryName }) => ({
            category: { id, name: categoryName },
            group: colors.get(id) ?? NEUTRAL,
          }),
        )}
      />
    </span>
  );
};

/** A row's second line: the formal name in italics, then the chips, a dot between those two only. */
const noteOf = (formal: string | null | undefined, chips: ReactNode): ReactNode => {
  if (!formal) return chips;
  return (
    <>
      <span className="spell-steps__formal">{formal}</span>
      {chips && ' · '}
      {chips}
    </>
  );
};

/** Every live form of every live ingredient found, under the heading of where it came from. */
function pickRows(
  data: SpellIngredientSuggestionsQuery,
  colors: ReadonlyMap<string, GroupColors>,
  assigned: ReadonlySet<string>,
  missing: ReadonlySet<string>,
  inJar: ReadonlySet<string>,
  narrowedNames: readonly string[],
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
            // Information only: the row stays pickable, since a form may be laid again.
            badge: inJar.has(variant.id) ? (
              <span className="badge badge--muted spell-steps__in-jar">In Jar</span>
            ) : undefined,
            // The form's categories, else the ingredient's, as small print on that line.
            // The formal name in italics, then the chips, with a dot between the two only.
            meta: noteOf(
              node.canonicalName,
              categoryNames(
                name,
                variant.categories.length > 0 ? variant.categories : node.categories,
                colors,
                assigned,
                missing,
              ),
            ),
            // A pressed filter is named in the heading, where the results are read.
            heading: [
              group === 'yours' ? YOUR_INGREDIENTS : COMPENDIUM_HEADING,
              ...(narrowedNames.length > 0 ? [`In ${narrowedNames.join(', ')}`] : []),
            ].join(' · '),
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
  const { colors, names } = useCategoryIndex();
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
  const narrowedNames = useMemo(
    () => narrowedBy.flatMap((categoryId) => names.get(categoryId) ?? []),
    [narrowedBy, names],
  );
  // The forms already laid as a step, marked on their rows.
  const inJar = useMemo(
    () => new Set((jarSteps ?? []).flatMap(({ variantId }) => (variantId ? [variantId] : []))),
    [jarSteps],
  );
  const shape = useMemo(
    () => (data: SpellIngredientSuggestionsQuery) =>
      pickRows(data, colors, assigned, missing, inJar, narrowedNames),
    [colors, assigned, missing, inJar, narrowedNames],
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

  const { aria, ...shell } = fieldDescription({
    id,
    hint: PICKER_HINT,
    error: refused ? ONE_OFF_TAKEN : undefined,
  });
  return (
    <FieldShell label="Add to Jar" hint={PICKER_HINT} {...shell}>
      {/* One frame round the box and the filter tray: the filter reads as part of the search. */}
      <div className="spell-steps__frame">
        <Combobox<IngredientPickOption>
          id={shell.controlId}
          label="Add to Jar"
          labelId={shell.labelId}
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
          placeholder="Add an ingredient"
          {...aria}
        />
        {/* The tray inside the frame; the open list is layered over it (z-index, Combobox). Each chip
          is a toggle: none pressed is no filter, one or more keeps ingredients carrying any. */}
        {assigned.size > 0 && (
          <div className="spell-steps__filter">
            <div className="spell-steps__filter-head">
              <span id={`${id}-filter-label`} className="spell-steps__filter-label">
                Filter By Category
              </span>
              {narrowedBy.length > 0 && (
                <button
                  type="button"
                  className="spell-steps__filter-clear"
                  onClick={() => setPressed([])}
                >
                  Clear
                </button>
              )}
            </div>
            <p id={`${id}-filter-note`} className="field__hint">
              Show only ingredients in any of the pressed categories.
            </p>
            <div className="spell-steps__filter-row">
              <div
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a fieldset or details would add a legend or a disclosure; this is a plain labelled group
                role="group"
                aria-labelledby={`${id}-filter-label`}
                aria-describedby={`${id}-filter-note`}
                className="spell-steps__filter-chips"
              >
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
                          on
                            ? narrowedBy.filter((id) => id !== categoryId)
                            : [...narrowedBy, categoryId],
                        )
                      }
                    >
                      {on ? (
                        <CheckIcon />
                      ) : (
                        <span className="spell-steps__filter-dot" aria-hidden="true" />
                      )}
                      {name}
                    </button>,
                  ];
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </FieldShell>
  );
}
