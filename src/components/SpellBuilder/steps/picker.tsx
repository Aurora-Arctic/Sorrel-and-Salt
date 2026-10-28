'use client';

import { formLabel } from '@/modules/ingredients/validation/form-label';

import { type ReactElement, useCallback, useId, useMemo, useState } from 'react';
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
  /** The forms already in the jar: offered, but not pickable again. */
  taken: ReadonlySet<string>;
  /** The one-off names already in the jar, case and spaces aside. */
  oneOffs: ReadonlySet<string>;
  onAdd: (step: SpellStepValue) => void;
}

const ALREADY_IN_JAR = 'Already in the jar';
const ONE_OFF_TAKEN = 'This ingredient is already in the jar';

/** A one-off's name as the jar compares it: case and outer spaces aside. */
export const oneOffKey = (name: string): string => name.trim().toLocaleLowerCase();

/** Every live form of every live ingredient found, under the heading of where it came from. */
function pickRows(
  data: SpellIngredientSuggestionsQuery,
  taken: ReadonlySet<string>,
): IngredientPickOption[] {
  return data.ingredientSuggestions.edges.flatMap(({ group, node }) =>
    // A retired entry is kept where a spell lays it, never added anew.
    node.retired
      ? []
      : node.variants.map(({ form, ...variant }) => {
          const name = node.cupboardEntry?.label ?? node.name;
          const icon = (variant.formChoice?.group.icon ?? null) as FormGroupIcon | null;
          const inJar = taken.has(variant.id);
          return {
            value: name,
            label: `${name} (${formLabel(form)})`,
            note: inJar ? ALREADY_IN_JAR : (node.canonicalName ?? undefined),
            heading: group === 'yours' ? YOUR_INGREDIENTS : COMPENDIUM_HEADING,
            key: variant.id,
            icon: <FormIcon name={icon} />,
            disabled: inJar || undefined,
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

export function StepPicker({ workspaceId, taken, oneOffs, onAdd }: StepPickerProps): ReactElement {
  const id = useId();
  const [text, setText] = useState('');
  const [active, setActive] = useState(false);
  const [refused, setRefused] = useState(false);
  const shape = useCallback(
    (data: SpellIngredientSuggestionsQuery) => pickRows(data, taken),
    [taken],
  );
  const suggestions = useLookup(
    SpellIngredientSuggestionsDocument,
    { workspaceId },
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
