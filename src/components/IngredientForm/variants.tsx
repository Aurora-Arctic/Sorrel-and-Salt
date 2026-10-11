'use client';

import { type ReactElement, useCallback, useId, useMemo, useRef, useState } from 'react';
import {
  get,
  useController,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';
import Combobox from '../Combobox';
import InfoTip from '../InfoTip';
import { CategoryField } from './categories';
import { FieldError, TextField } from '../Field';
import { ListField, MultiSelectField } from './fields';
import { ELEMENT_OPTIONS } from './options';
import { ReferencesField } from './references';
import { SubstituteForms } from './substitute-forms';
import {
  FormField,
  LookupListField,
  curatedOnly,
  useCompendiumSubstitutes,
  useFormSuggestions,
  usePlanetSuggestions,
  useSubstituteSuggestions,
  useZodiacSuggestions,
} from './suggestions';
import type {
  FormLink,
  FormOption,
  IngredientFormValues,
  ListOption,
  VariantFieldsetProps,
  VariantsFieldProps,
} from './types';
import { EMPTY_VARIANT, rankForForm, repeatedForm } from './values';

// The Variants section (MB.221): the forms an ingredient comes in, each a
// fieldset of what that form adds to the ingredient — never overrides
// (MB.215) — and the New Form box that adds one. A form is added from the
// box as a list's entry is, refused there when the ingredient already comes
// in it, and taken out by its own Remove. Each variant's fields are the
// ingredient's own field components at its place in the values,
// `variants.1.planets`, so they validate, err and focus as the ingredient's
// do (claude-docs/components/ingredient-form.md, "The variants").

const BOX = 'drafts.variants';

export function VariantsField({ workspaceId }: VariantsFieldProps): ReactElement {
  // The compendium holds curated forms alone (MB.162): its box offers those
  // rows and no typed row, and a pick is the only way in.
  const compendium = workspaceId === null;
  const { control, getValues, setValue, setError, clearErrors, getFieldState, trigger } =
    useFormContext<IngredientFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const { field } = useController({ control, name: BOX });
  const { errors, isSubmitted } = useFormState({ control, name: BOX });
  const listed = useWatch({ control, name: 'variants' });
  const [active, setActive] = useState(false);
  const found = curatedOnly(useFormSuggestions(workspaceId, field.value, active), compendium);
  // A form the ingredient already comes in is not offered again.
  const suggestions = useMemo(
    () => ({
      ...found,
      options: found.options.filter((option) => !repeatedForm(listed, option.value)),
    }),
    [found, listed],
  );
  const id = useId();
  const legendId = `${id}-legend`;
  const hintId = `${id}-hint`;
  const promptId = `${id}-prompt`;
  const errorId = `${id}-error`;
  const boxElement = useRef<HTMLInputElement | null>(null);
  // The box and its Add together, which the open list spans, as a list's row is.
  const [boxRow, setBoxRow] = useState<HTMLDivElement | null>(null);
  // What the last add or removal did, for a screen reader: a fieldset
  // appearing or going is otherwise unannounced.
  const [announcement, setAnnouncement] = useState('');
  const focusBox = () => boxElement.current?.focus();

  const error: string | undefined = get(errors, BOX)?.message;
  // Shown while a compendium entry has no form: it saves, but as information
  // only, which nothing can stock or lay in a spell (MB.215).
  const prompting = compendium && fields.length === 0;
  const describedBy = [hintId, prompting && promptId, error && errorId].filter(Boolean).join(' ');

  // Refused at the box, as a list refuses a repeat: the text stays, to be
  // put right, and the error element says why.
  const refuse = (type: 'repeat' | 'unpicked', message: string) => {
    setError(BOX, { type, message });
    setAnnouncement(message);
    focusBox();
  };
  // Gone once the text it judged is changed.
  const clearRefusal = () => {
    const type = getFieldState(BOX).error?.type;
    if (type === 'repeat' || type === 'unpicked') clearErrors(BOX);
  };
  const addForm = (text: string, link: FormLink | null) => {
    const form = text.trim();
    if (form === '') return;
    const why = repeatedForm(getValues('variants'), form);
    if (why) {
      refuse('repeat', why);
      return;
    }
    // Not focused by the field array, which would take the new Form box: the
    // New Form box keeps it, ready for the next.
    append({ ...EMPTY_VARIANT, form, formLink: link }, { shouldFocus: false });
    setValue(BOX, '');
    clearErrors(BOX);
    setAnnouncement(`Added ${form}`);
    if (isSubmitted) void trigger(BOX);
    focusBox();
  };
  const removeAt = (index: number) => {
    setAnnouncement(`Removed ${getValues(`variants.${index}.form`)}`);
    remove(index);
    focusBox();
  };

  return (
    // Named by the legend's text alone, as a list's fieldset is.
    <fieldset className="fieldset ingredient-form__variants" aria-labelledby={legendId}>
      <legend className="fieldset__legend ingredient-form__label-row">
        <span id={legendId}>Variants</span>
        <InfoTip id={hintId} label="Variants">
          The forms it comes in: dried leaf, oil, whole root. Each adds its own description, safety
          notes and lists to the ingredient&rsquo;s, and never takes any away.
        </InfoTip>
      </legend>
      {prompting && (
        <p className="field__hint" id={promptId}>
          Add at least one form: an entry with none is information only, and no coven can stock it.
        </p>
      )}
      {fields.map((row, index) => (
        <VariantFieldset key={row.id} index={index} workspaceId={workspaceId} onRemove={removeAt} />
      ))}
      <div ref={setBoxRow} className="ingredient-form__row">
        <Combobox<FormOption>
          id={`${id}-box`}
          label="New Form"
          value={field.value}
          onChange={(typed) => {
            clearRefusal();
            field.onChange(typed);
          }}
          onFocus={() => setActive(true)}
          onBlur={field.onBlur}
          onPick={(value, option) => addForm(value, option?.link ?? null)}
          onCommit={
            compendium
              ? (typed) => {
                  if (typed.trim() !== '')
                    refuse('unpicked', `Pick "${typed.trim()}" from the list`);
                }
              : (typed) => addForm(typed, null)
          }
          suggestions={suggestions}
          offerTyped={!compendium && !repeatedForm(listed, field.value)}
          listAnchor={boxRow}
          inputRef={(element) => {
            field.ref(element);
            boxElement.current = element;
          }}
          name={field.name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {!compendium && (
          <button
            type="button"
            className="btn"
            aria-label="Add Variant"
            onClick={() => addForm(getValues(BOX), null)}
          >
            Add
          </button>
        )}
      </div>
      <FieldError id={errorId} message={error} />
      {/* Labelled, so that it is told from the box's own status region. */}
      <output className="visually-hidden" aria-label="Variants changes">
        {announcement}
      </output>
    </fieldset>
  );
}

/**
 * One variant: a fieldset named by its form, holding what that form adds, in
 * the order the ingredient's own fields run, and its Remove.
 */
function VariantFieldset({ workspaceId, index, onRemove }: VariantFieldsetProps): ReactElement {
  const compendium = workspaceId === null;
  const at = `variants.${index}` as const;
  const { control } = useFormContext<IngredientFormValues>();
  const form = useWatch({ control, name: `${at}.form` });
  const group = useWatch({ control, name: `${at}.formLink` })?.group ?? null;
  // Its form, as typed; a form emptied in its box still names the fieldset.
  const legend = form.trim() || 'Unnamed Form';
  // An ingredient in this form is the likeliest stand-in, then one in its group.
  const rank = useCallback(
    (options: ListOption[]) => rankForForm(options, form, group),
    [form, group],
  );
  const legendId = `${useId()}-legend`;
  return (
    <fieldset className="fieldset ingredient-form__variant" aria-labelledby={legendId}>
      <legend className="fieldset__legend ingredient-form__variant-legend">
        <span id={legendId}>{legend}</span>
        {/* Named for its form, as a list entry's × is for its entry. */}
        <button
          type="button"
          className="btn btn--quiet"
          aria-label={`Remove ${legend}`}
          onClick={() => onRemove(index)}
        >
          Remove
        </button>
      </legend>
      {/* On the compendium the form must be a pick (MB.162). */}
      <FormField workspaceId={workspaceId} at={at} pickOnly={compendium} />
      <TextField<IngredientFormValues> name={`${at}.description`} label="Description" multiline />
      <TextField<IngredientFormValues>
        name={`${at}.safetyNotes`}
        label="Safety Notes"
        hint="What to take care over with this form in particular: an oil diluted, a resin burned."
        multiline
      />
      <MultiSelectField
        name={`${at}.elements`}
        label="Element"
        placeholder="Choose elements"
        options={ELEMENT_OPTIONS}
      />
      <LookupListField
        workspaceId={workspaceId}
        useSuggestions={usePlanetSuggestions}
        name={`${at}.planets`}
        ordered
        pickOnly={compendium}
        legend="Planets"
        entry="Planet"
      />
      <LookupListField
        workspaceId={workspaceId}
        useSuggestions={useZodiacSuggestions}
        name={`${at}.zodiacSigns`}
        ordered
        pickOnly={compendium}
        legend="Zodiac Signs"
        entry="Zodiac Sign"
      />
      <ListField name={`${at}.colors`} ordered legend="Colours" entry="Colour" />
      <CategoryField at={at} />
      {/* Any ingredient may stand in for a form, this one's other forms
          included, so nothing is left out; those in this form, or in its
          group, are offered first, and one in forms names which (MB.215). */}
      <LookupListField
        workspaceId={workspaceId}
        // Fixed for the form's life, since its tier is, so the hook called is always the same.
        useSuggestions={compendium ? useCompendiumSubstitutes : useSubstituteSuggestions}
        rank={rank}
        name={`${at}.substitutes`}
        legend="Substitute Ingredients"
        entry="Substitute Ingredient"
      />
      <SubstituteForms name={`${at}.substitutes`} />
      <ReferencesField workspaceId={workspaceId} at={at} />
    </fieldset>
  );
}
