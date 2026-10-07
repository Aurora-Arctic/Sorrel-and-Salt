'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import type { CompendiumIngredientInput, CompendiumIngredientUpdateInput } from '../../gql/graphql';
import { graphqlRequest } from '../../lib/graphql-client';
import { NAMELESS_KIND, UNSETTLED_KIND } from '@/modules/ingredients/schema/ingredient-enums';
import { CategoryField } from './categories';
import { NameField, useDuplicateWarning } from './duplicates';
import { ReferencesField } from './references';
import { ListField, MultiSelectField, SelectField, TextField } from './fields';
import { ELEMENT_OPTIONS, NOMENCLATURE_OPTIONS } from './options';
import {
  FormField,
  LookupListField,
  useCommonNameSuggestions,
  useCompendiumSubstitutes,
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
  RedirectQuestion,
  SavedIngredient,
} from './types';
import {
  EMPTY_VALUES,
  GENERIC_ERROR,
  compendiumResolver,
  fieldNameOf,
  ingredientResolver,
  issuesOf,
} from './values';
import './index.scss';

// Every property of an ingredient, validated by the shared schema before the
// mutation is sent, and by the service again after. An error from either side
// lands beside the field its path names, through the same element; one naming
// no field lands above them all. A coven's new ingredient, or a compendium
// entry, new or given to edit (M5.5).
// See claude-docs/components/ingredient-form.md.

const CreateWorkspaceIngredientDocument = graphql(`
  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {
    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {
      id
      name
      slug
    }
  }
`);

const CreateCompendiumIngredientDocument = graphql(`
  mutation CreateCompendiumIngredient($input: CompendiumIngredientInput!, $endRedirect: Boolean) {
    createCompendiumIngredient(input: $input, endRedirect: $endRedirect) {
      id
      name
      slug
    }
  }
`);

const UpdateCompendiumIngredientDocument = graphql(`
  mutation UpdateCompendiumIngredient(
    $id: ID!
    $input: CompendiumIngredientUpdateInput!
    $endRedirect: Boolean
  ) {
    updateCompendiumIngredient(id: $id, input: $input, endRedirect: $endRedirect) {
      id
      name
      slug
    }
  }
`);

const DeleteCompendiumIngredientDocument = graphql(`
  mutation DeleteCompendiumIngredient($id: ID!) {
    deleteCompendiumIngredient(id: $id)
  }
`);

/** The path of MB.82's refusal: the write would end another entry's redirect, unless confirmed. */
const END_REDIRECT = 'endRedirect';

const IngredientForm = ({
  workspaceId,
  entry,
  onSaved,
  onDeleted,
  onCancel,
  duplicateHref,
}: IngredientFormProps): ReactElement => {
  // A null coven is the compendium: the classification answered, the
  // vocabulary boxes picked from the curated rows, and every lookup asking
  // about the compendium alone (M5.5; MB.162).
  const compendium = workspaceId === null;
  const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
    defaultValues: entry?.values ?? EMPTY_VALUES,
    resolver: compendium ? compendiumResolver : ingredientResolver,
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
    formState: { errors, isSubmitting, isDirty, submitCount },
  } = methods;
  const form = useRef<HTMLFormElement>(null);
  const createAnyway = useRef<HTMLButtonElement>(null);
  const duplicates = useDuplicateWarning(
    workspaceId,
    useWatch({ control, name: 'name' }),
    entry?.id,
  );
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
  // MB.82's question while it waits for an answer: the save is kept, and End
  // Redirect & Save sends it again, confirmed.
  const [question, setQuestion] = useState<RedirectQuestion | null>(null);
  // The delete's own confirmation, and why a delete was refused.
  const [deleting, setDeleting] = useState(false);
  const [refusal, setRefusal] = useState<string>();

  const mutation = useMutation({
    mutationFn: async ({
      input,
      endRedirect,
    }: {
      input: IngredientFormInput;
      endRedirect: boolean;
    }): Promise<SavedIngredient> => {
      if (workspaceId !== null) {
        const answer = await graphqlRequest(CreateWorkspaceIngredientDocument, {
          workspaceId,
          input,
        });
        return answer.createWorkspaceIngredient;
      }
      // The compendium resolver has refused a missing classification, so the
      // input is the compendium's, whose `nomenclature` is required.
      if (entry) {
        // The update takes the whole entry, every field present (MB.159):
        // no pick is `""` there, where the create takes null.
        const whole = { ...input, formId: input.formId ?? '' } as CompendiumIngredientUpdateInput;
        const answer = await graphqlRequest(UpdateCompendiumIngredientDocument, {
          id: entry.id,
          input: whole,
          endRedirect,
        });
        return answer.updateCompendiumIngredient;
      }
      const answer = await graphqlRequest(CreateCompendiumIngredientDocument, {
        input: input as CompendiumIngredientInput,
        endRedirect,
      });
      return answer.createCompendiumIngredient;
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => graphqlRequest(DeleteCompendiumIngredientDocument, { id }),
  });

  /** Sends the input, and says what came of it: saved, asked about, or refused beside its fields. */
  const deliver = async (input: IngredientFormInput, endRedirect: boolean): Promise<void> => {
    try {
      const row = await mutation.mutateAsync({ input, endRedirect });
      onSaved?.(row, next.current);
      setSaved(row.name);
      // Save Ingredient's page opens what it made, so its form is about to go
      // and keeps its values; Save & Add Another clears for the next one. An
      // edit keeps what it saved, now nothing to save until it changes again.
      if (next.current === 'another') setSaves((count) => count + 1);
      else if (entry) reset(getValues());
    } catch (error) {
      // setError, as the resolver's own errors are set: the next submit or an
      // edit to the field clears them the same way. MB.82's refusal is a
      // question rather than an error: it asks before the save goes again.
      const unplaced: string[] = [];
      for (const { path, message } of issuesOf(error)) {
        if (path[0] === END_REDIRECT) {
          setQuestion({ message, input });
          continue;
        }
        const name = fieldNameOf(path, getValues());
        if (name === undefined) unplaced.push(message);
        else setError(name, { type: 'server', message });
      }
      if (unplaced.length > 0) setError('root', { type: 'server', message: unplaced.join(' ') });
    }
  };

  const save = async (input: IngredientFormInput): Promise<void> => {
    // A near match not yet dismissed holds a save that would otherwise go,
    // asked about the name being sent rather than waiting out the debounce.
    // After validation, so an error to fix comes first.
    if (await duplicates.check(input.name)) return;
    await deliver(input, false);
  };

  const endRedirect = async (): Promise<void> => {
    if (!question) return;
    await deliver(question.input, true);
    setQuestion(null);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!entry) return;
    setRefusal(undefined);
    try {
      await remove.mutateAsync(entry.id);
      onDeleted?.();
    } catch (error) {
      // Not a bad value in a box: a refusal naming its remedy (DESIGN.md §7).
      setDeleting(false);
      setRefusal(issuesOf(error)[0]?.message ?? GENERIC_ERROR);
    }
  };

  // An edit saves over the entry, and opens nothing new; a new entry offers
  // both saves (MB.131).
  const editing = entry !== undefined;

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
          setRefusal(undefined);
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
        {refusal && (
          <p className="notice notice--error" role="alert">
            {refusal}
          </p>
        )}
        {/* Warns beneath it of the entries its name resembles (story 16),
            and a save stops on the warning until it is answered. */}
        <NameField warning={duplicates} hrefOf={duplicateHref} ref={createAnyway} />
        {/* The kind decides the formal name's error, so a change to it
            revalidates the formal name. A named kind marks it required;
            Unknown leaves it open and optional. A coven's formal name with no
            kind saves as unknown, so nothing marks the kind there (MB.161);
            a compendium entry declares one always (§5). None takes no formal
            name at all, so choosing it empties the field and shuts it, with
            the reason in view rather than in a tip: a shut field that does
            not say why reads as broken. */}
        <SelectField
          name="nomenclature"
          label="Classification"
          hint='Botanical for a plant, mineral for a stone, and so on. "Unknown" if you are not sure which, with or without a formal name. "None" takes no formal name.'
          placeholder="Choose a classification"
          options={NOMENCLATURE_OPTIONS}
          required={compendium}
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
            also links its row, the group shown in the box (MB.169). On the
            compendium the form must be that pick (MB.162). */}
        <FormField workspaceId={workspaceId} pickOnly={compendium} />
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
            adding a link to the ingredient. On the compendium the planets,
            signs and deities are picks of the curated rows alone, and the
            substitutes its other entries (MB.162, MB.138). Planets, signs,
            colours and deities keep the order entered, so their entries move
            (MB.170); folk names and substitutes read alphabetically, so
            theirs do not. */}
        <LookupListField
          workspaceId={workspaceId}
          useSuggestions={usePlanetSuggestions}
          name="planets"
          ordered
          pickOnly={compendium}
          legend="Planets"
          entry="Planet"
          hint="The heavenly bodies it answers to: the planets, the Sun and the Moon."
        />
        <LookupListField
          workspaceId={workspaceId}
          useSuggestions={useZodiacSuggestions}
          name="zodiacSigns"
          ordered
          pickOnly={compendium}
          legend="Zodiac Signs"
          entry="Zodiac Sign"
          hint="The signs it answers to."
        />
        <ListField
          name="colors"
          ordered
          legend="Colours"
          entry="Colour"
          hint="The colours it corresponds to in a working, not the colour it is."
        />
        <LookupListField
          workspaceId={workspaceId}
          useSuggestions={useDeitySuggestions}
          name="deities"
          ordered
          pickOnly={compendium}
          legend="Deities"
          entry="Deity"
          hint="The gods and spirits it is sacred to."
        />
        <LookupListField
          workspaceId={workspaceId}
          // Fixed for the form's life, since its tier is, so the hook called is always the same.
          useSuggestions={compendium ? useCompendiumSubstitutes : useSubstituteSuggestions}
          omit={entry?.id}
          name="substitutes"
          legend="Substitute Ingredients"
          entry="Substitute Ingredient"
          hint="Other ingredients to use in its place when this one is not to hand."
        />
        {/* After the lists (MB.126): every live category, picked from chips
            grouped by category group. */}
        <CategoryField />
        <TextField
          name="safetyNotes"
          label="Safety Notes"
          hint="Toxicity, allergies, and anything to take care over when handling or burning it."
          multiline
        />
        {/* Last, as a bibliography is (MB.154): the sources picked, each
            with its locator, and a panel for a new one. */}
        <ReferencesField workspaceId={workspaceId} />
        {question ? (
          // MB.82: the address this save takes is another entry's redirect.
          // Asked in place of the saves, so nothing else is pressed until it
          // is answered; Keep It leaves the entry as typed, unsaved.
          <div className="ingredient-form__confirm">
            <p>{question.message}</p>
            <div className="form__actions">
              <button
                type="button"
                className="btn btn--solid"
                disabled={mutation.isPending}
                aria-busy={mutation.isPending || undefined}
                onClick={() => void endRedirect()}
              >
                {mutation.isPending && <span className="spinner" aria-hidden="true" />}
                {mutation.isPending ? 'Saving Ingredient' : 'End Redirect & Save'}
              </button>
              <button type="button" className="btn btn--quiet" onClick={() => setQuestion(null)}>
                Keep It
              </button>
            </div>
          </div>
        ) : deleting ? (
          <div className="ingredient-form__confirm">
            <p>
              Delete &quot;{entry?.values.name}&quot;? It leaves the compendium; a spell holding it
              keeps it.
            </p>
            <div className="form__actions">
              <button
                type="button"
                className="btn btn--destructive"
                disabled={remove.isPending}
                aria-busy={remove.isPending || undefined}
                onClick={() => void confirmDelete()}
              >
                {remove.isPending && <span className="spinner" aria-hidden="true" />}
                {remove.isPending ? 'Deleting' : 'Delete'}
              </button>
              <button type="button" className="btn btn--quiet" onClick={() => setDeleting(false)}>
                Keep It
              </button>
            </div>
          </div>
        ) : (
          <div className="form__actions ingredient-form__actions">
            {/* Two saves, both held down from the press to the answer, the
                duplicate check included: Save Ingredient, first and so the
                default Enter presses, opens what it made; Save & Add Another
                clears the form for the next. The one pressed says so,
                "Saving Ingredient" with a spinner and `aria-busy`, the owner's
                call during MB.131. Both are off until something is entered or
                changed, the owner's rule for every form (M5.6). An edit has
                the first alone, and Delete apart at the far end. */}
            <button
              type="submit"
              value="open"
              className="btn btn--solid"
              disabled={!isDirty || isSubmitting}
              aria-busy={busy('open')}
            >
              {busy('open') && <span className="spinner" aria-hidden="true" />}
              {busy('open') ? 'Saving Ingredient' : 'Save Ingredient'}
            </button>
            {!editing && (
              <button
                type="submit"
                value="another"
                className="btn"
                disabled={!isDirty || isSubmitting}
                aria-busy={busy('another')}
              >
                {busy('another') && <span className="spinner" aria-hidden="true" />}
                {busy('another') ? 'Saving Ingredient' : 'Save & Add Another'}
              </button>
            )}
            {onCancel && (
              <button type="button" className="btn btn--quiet" onClick={onCancel}>
                Cancel
              </button>
            )}
            {editing && (
              <button
                type="button"
                className="btn btn--destructive ingredient-form__delete"
                onClick={() => {
                  setRefusal(undefined);
                  setDeleting(true);
                }}
              >
                Delete Ingredient
              </button>
            )}
          </div>
        )}
      </form>
    </FormProvider>
  );
};

export default IngredientForm;
