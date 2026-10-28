'use client';

import { formLabel } from '@/modules/ingredients/validation/form-label';

import { type ReactElement, useCallback, useId, useState } from 'react';
import type { SpellIngredientSuggestionsQuery } from '../../../gql/graphql';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import Combobox from '../../Combobox';
import { FieldError } from '../../Field';
import FormIcon from '../../FormIcon';
import { useLookup } from '../../IngredientForm/suggestions';
import { COMPENDIUM_HEADING, YOUR_INGREDIENTS } from '../../IngredientForm/values';
import { SpellIngredientSuggestionsDocument } from './documents';
import type { IngredientPickOption, SpellStepValue } from './types';
import { jarUnitOf, newStep } from './values';

// Add to Jar (M10.15, story 49): the type-ahead over the coven's ingredients
// and the compendium's, one row per form, since a step lays a form; and a
// one-off ingredient written for this jar alone, which makes no ingredient.
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
              jarUnit: jarUnitOf(node.stock, variant.id),
            }),
          };
        }),
  );
}

export function StepPicker({ workspaceId, taken, oneOffs, onAdd }: StepPickerProps): ReactElement {
  const id = useId();
  const [text, setText] = useState('');
  const [active, setActive] = useState(false);
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

  const [oneOffName, setOneOffName] = useState('');
  const [oneOffForm, setOneOffForm] = useState('');
  const [refused, setRefused] = useState(false);
  const addOneOff = () => {
    if (oneOffs.has(oneOffKey(oneOffName))) {
      setRefused(true);
      return;
    }
    onAdd(
      newStep({
        ingredientId: null,
        variantId: null,
        name: oneOffName.trim(),
        form: oneOffForm.trim() || null,
        icon: null,
        categories: [],
        jarUnit: null,
      }),
    );
    setOneOffName('');
    setOneOffForm('');
  };

  return (
    <fieldset className="fieldset">
      <legend className="fieldset__legend">Add to Jar</legend>
      <div className="field">
        <div className="field__label-row">
          <label className="field__label" id={`${id}-search-label`} htmlFor={`${id}-search`}>
            Search Ingredients
          </label>
        </div>
        <Combobox<IngredientPickOption>
          id={`${id}-search`}
          label="Search Ingredients"
          labelId={`${id}-search-label`}
          value={text}
          onChange={setText}
          onFocus={() => setActive(true)}
          onPick={(_, option) => {
            if (option === null || option.disabled) return;
            onAdd(option.step);
            setText('');
          }}
          suggestions={suggestions}
          toggle={false}
          offerTyped={false}
          noun="ingredient"
          placeholder="Search"
        />
      </div>
      <div className="field">
        <div className="field__label-row">
          <label className="field__label" htmlFor={`${id}-name`}>
            One-Off Name
          </label>
        </div>
        <input
          id={`${id}-name`}
          className="input"
          autoComplete="off"
          placeholder="Add a name"
          value={oneOffName}
          onChange={(event) => {
            setOneOffName(event.target.value);
            setRefused(false);
          }}
          aria-invalid={refused || undefined}
          aria-describedby={refused ? `${id}-name-error` : undefined}
        />
        <FieldError id={`${id}-name-error`} message={refused ? ONE_OFF_TAKEN : undefined} />
      </div>
      <div className="field">
        <div className="field__label-row">
          <label className="field__label" htmlFor={`${id}-form`}>
            One-Off Form
          </label>
        </div>
        <input
          id={`${id}-form`}
          className="input"
          autoComplete="off"
          placeholder="Add a form"
          value={oneOffForm}
          onChange={(event) => setOneOffForm(event.target.value)}
        />
      </div>
      <button type="button" className="btn" disabled={oneOffName.trim() === ''} onClick={addOneOff}>
        Add One-Off Ingredient
      </button>
    </fieldset>
  );
}
