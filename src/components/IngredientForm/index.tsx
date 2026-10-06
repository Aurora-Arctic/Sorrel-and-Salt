'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import {
  INGREDIENT_ELEMENTS,
  NAMELESS_KIND,
  NOMENCLATURE_KINDS,
  UNSETTLED_KIND,
} from '@/modules/ingredients/schema/ingredient-enums';
import { NameField, useDuplicateWarning } from './duplicates';
import { ListField, MultiSelectField, SelectField, TextField } from './fields';
import {
  FormField,
  LookupListField,
  useCommonNameSuggestions,
  useDeitySuggestions,
  usePlanetSuggestions,
  useSubstituteSuggestions,
  useZodiacSuggestions,
} from './suggestions';
import type {
  AfterSave,
  IngredientFormInput,
  IngredientFormProps,
  IngredientFormValues,
} from './types';
import { EMPTY_VALUES, fieldNameOf, ingredientResolver, issuesOf } from './values';
import './index.scss';

// Every property of a coven's own ingredient, validated by the shared schema
// before the mutation is sent, and by the service again after. An error from
// either side lands beside the field its path names, through the same
// element; one naming no field lands above them all.
// See claude-docs/components/ingredient-form.md.

const CreateWorkspaceIngredientDocument = graphql(`
  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {
    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {
      id
      name
    }
  }
`);

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
const optionsOf = (values: readonly string[]) =>
  values.map((value) => ({ value, label: capitalise(value) }));

const NOMENCLATURE_OPTIONS = optionsOf(NOMENCLATURE_KINDS);
const ELEMENT_OPTIONS = optionsOf(INGREDIENT_ELEMENTS);

const IngredientForm = ({ workspaceId, onSaved }: IngredientFormProps): ReactElement => {
  const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
    defaultValues: EMPTY_VALUES,
    resolver: ingredientResolver,
    // react-hook-form focuses in registration order and only a registered
    // field; a list entry is neither, so the effect below does it instead.
    shouldFocusError: false,
  });
  const {
    control,
    handleSubmit,
    getValues,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting, submitCount },
  } = methods;
  const form = useRef<HTMLFormElement>(null);
  const createAnyway = useRef<HTMLButtonElement>(null);
  const duplicates = useDuplicateWarning(workspaceId, useWatch({ control, name: 'name' }));
  const { blocking } = duplicates;
  const kind = useWatch({ control, name: 'nomenclature' });

  // A submit's last update carries its count and every error it found, the
  // resolver's or the server's, so this runs once they are all drawn: the
  // first field marked invalid, in page order, takes the focus. A layout
  // effect, so the focus moves in the commit that draws the error: a passive
  // effect leaves a gap in which the error shows and the focus has not moved.
  useLayoutEffect(() => {
    if (submitCount > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submitCount]);
  // A save held on the duplicate warning focuses its button rather than the
  // name it marks, which needs no change, only an answer. After the effect
  // above, so it wins when both run, and again on each held save.
  useLayoutEffect(() => {
    if (blocking) createAnyway.current?.focus();
  }, [blocking, submitCount]);

  // Save & Add Another leaves the form ready for the next ingredient, the owner's call
  // (MB.131): once the save has landed, every field and list empties and the
  // name takes the focus. In an effect rather than in `save`, so the reset
  // comes after react-hook-form's own end-of-submit update, and counted here
  // rather than read off `isSubmitSuccessful`, which a save held on the
  // duplicate warning sets too. The name is found in the page, as the error
  // focus above finds its field: `setFocus` reads a ref the reset has just
  // dropped, and the field registers again only on the next render.
  const [saves, setSaves] = useState(0);
  // What the last save wrote, said above the fields where a refusal would be,
  // so the cleared form is not the only sign it landed. A new save drops it.
  const [saved, setSaved] = useState<string | null>(null);
  // Which save was pressed: read by `save` from a ref, since the submit
  // handler passes the input alone, and drawn from state as the busy button.
  const next = useRef<AfterSave>('open');
  const [pressed, setPressed] = useState<AfterSave>('open');
  const busy = (button: AfterSave) => (isSubmitting && pressed === button) || undefined;
  useEffect(() => {
    if (saves === 0) return;
    reset(EMPTY_VALUES);
    form.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  }, [saves, reset]);

  const mutation = useMutation({
    mutationFn: (input: IngredientFormInput) =>
      graphqlRequest(CreateWorkspaceIngredientDocument, { workspaceId, input }),
  });

  const save = async (input: IngredientFormInput): Promise<void> => {
    // A near match not yet dismissed holds a save that would otherwise go,
    // asked about the name being sent rather than waiting out the debounce.
    // After validation, so an error to fix comes first.
    if (await duplicates.check(input.name)) return;
    try {
      const { createWorkspaceIngredient } = await mutation.mutateAsync(input);
      onSaved?.(createWorkspaceIngredient, next.current);
      setSaved(createWorkspaceIngredient.name);
      // Save Ingredient's page opens what it made, so its form is about to go
      // and keeps its values; Save & Add Another clears for the next one.
      if (next.current === 'another') setSaves((count) => count + 1);
    } catch (error) {
      // setError, as the resolver's own errors are set: the next submit or an
      // edit to the field clears them the same way.
      const unplaced: string[] = [];
      for (const { path, message } of issuesOf(error)) {
        const name = fieldNameOf(path, getValues());
        if (name === undefined) unplaced.push(message);
        else setError(name, { type: 'server', message });
      }
      if (unplaced.length > 0) setError('root', { type: 'server', message: unplaced.join(' ') });
    }
  };

  return (
    <FormProvider {...methods}>
      {/* `noValidate`: every refusal is the schema's, worded and placed like
          the rest, rather than the browser's own bubble. */}
      <form
        ref={form}
        className="form ingredient-form"
        // Built in the event rather than in render: `save` reads a ref.
        // Which button was pressed is the event's submitter; a submit with
        // none, Enter in a field, is Save Ingredient's, the form's default.
        onSubmit={(event) => {
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          next.current = submitter?.getAttribute('value') === 'another' ? 'another' : 'open';
          setPressed(next.current);
          setSaved(null);
          return handleSubmit(save)(event);
        }}
        noValidate
      >
        {saved !== null && (
          // `output` carries the status role itself, so no `role` attribute.
          <output className="notice notice--success">Saved {saved}.</output>
        )}
        {errors.root && (
          <p className="notice notice--error" role="alert">
            {errors.root.message}
          </p>
        )}
        {/* Warns beneath it of the entries its name resembles (story 16),
            and a save stops on the warning until it is answered. */}
        <NameField warning={duplicates} ref={createAnyway} />
        {/* The kind decides the formal name's error, so a change to it
            revalidates the formal name. A named kind marks it required;
            Unknown leaves it open and optional, and a formal name with no
            kind saves as unknown, so nothing marks the kind (MB.161). None
            takes no formal name at all, so choosing it empties the field and
            shuts it, with the reason in view rather than in a tip: a shut
            field that does not say why reads as broken. */}
        <SelectField
          name="nomenclature"
          label="Classification"
          hint='Botanical for a plant, mineral for a stone, and so on. "Unknown" if you are not sure which, with or without a formal name. "None" takes no formal name.'
          placeholder="Choose a classification"
          options={NOMENCLATURE_OPTIONS}
          deps={['canonicalName']}
          onChange={(value) => {
            if (value === NAMELESS_KIND) setValue('canonicalName', '');
          }}
        />
        <TextField
          name="canonicalName"
          label="Formal Name"
          hint="Its name in the classification's own system: Lavandula angustifolia, Quartz var. amethyst, Sodium chloride."
          note={kind === NAMELESS_KIND ? 'A "none" entry records no formal name.' : undefined}
          disabled={kind === NAMELESS_KIND}
          required={kind !== '' && kind !== NAMELESS_KIND && kind !== UNSETTLED_KIND}
        />
        {/* Both suggest from this coven and the compendium (M4.7a): the form
            from the curated vocabulary and the forms in use, the folk names
            from the names in use. A pick writes the text; a curated form's
            also links its row, the group shown in the box (MB.169). */}
        <FormField workspaceId={workspaceId} />
        <LookupListField
          workspaceId={workspaceId}
          useSuggestions={useCommonNameSuggestions}
          name="folkNames"
          legend="Folk Names"
          entry="Folk Name"
          hint="Other names it goes by. A search finds it by any of them."
        />
        <TextField name="description" label="Description" multiline />
        {/* Several at once, in the order chosen (MB.159); none chosen is
            the answer "none", so there is no None to choose. */}
        <MultiSelectField
          name="elements"
          label="Element"
          placeholder="Choose elements"
          options={ELEMENT_OPTIONS}
        />
        {/* Each list but the colours suggests (MB.131): planets, signs and
            deities from their curated vocabularies and the values in use, a
            pick adding the text, and a curated deity's a link to it as well
            (MB.169); substitutes from the compendium and this coven, a pick
            adding a link to the ingredient. */}
        <LookupListField
          workspaceId={workspaceId}
          useSuggestions={usePlanetSuggestions}
          name="planets"
          legend="Planets"
          entry="Planet"
          hint="The heavenly bodies it answers to: the planets, the Sun and the Moon."
        />
        <LookupListField
          workspaceId={workspaceId}
          useSuggestions={useZodiacSuggestions}
          name="zodiacSigns"
          legend="Zodiac Signs"
          entry="Zodiac Sign"
          hint="The signs it answers to."
        />
        <ListField
          name="colors"
          legend="Colours"
          entry="Colour"
          hint="The colours it corresponds to in a working, not the colour it is."
        />
        <LookupListField
          workspaceId={workspaceId}
          useSuggestions={useDeitySuggestions}
          name="deities"
          legend="Deities"
          entry="Deity"
          hint="The gods and spirits it is sacred to."
        />
        <LookupListField
          workspaceId={workspaceId}
          useSuggestions={useSubstituteSuggestions}
          name="substitutes"
          legend="Substitute Ingredients"
          entry="Substitute Ingredient"
          hint="Other ingredients to use in its place when this one is not to hand."
        />
        <TextField
          name="safetyNotes"
          label="Safety Notes"
          hint="Toxicity, allergies, and anything to take care over when handling or burning it."
          multiline
        />
        <div className="form__actions">
          {/* Two saves, both held down from the press to the answer, the
              duplicate check included: Save Ingredient, first and so the
              default Enter presses, opens what it made; Save & Add Another
              clears the form for the next. The one pressed says so, "Saving
              Ingredient" with a spinner and `aria-busy`, the owner's call
              during MB.131. */}
          <button
            type="submit"
            value="open"
            className="btn btn--solid"
            disabled={isSubmitting}
            aria-busy={busy('open')}
          >
            {busy('open') && <span className="ingredient-form__spinner" aria-hidden="true" />}
            {busy('open') ? 'Saving Ingredient' : 'Save Ingredient'}
          </button>
          <button
            type="submit"
            value="another"
            className="btn"
            disabled={isSubmitting}
            aria-busy={busy('another')}
          >
            {busy('another') && <span className="ingredient-form__spinner" aria-hidden="true" />}
            {busy('another') ? 'Saving Ingredient' : 'Save & Add Another'}
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

export default IngredientForm;
