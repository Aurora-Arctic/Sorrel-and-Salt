'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useEffect, useRef } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import {
  INGREDIENT_ELEMENTS,
  NAMELESS_KINDS,
  NOMENCLATURE_KINDS,
  type NomenclatureKind,
} from '@/modules/ingredients/schema/ingredient-enums';
import { ListField, SelectField, TextField } from './fields';
import type { IngredientFormInput, IngredientFormProps, IngredientFormValues } from './types';
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

const isNameless = (kind: string): kind is NomenclatureKind =>
  NAMELESS_KINDS.includes(kind as NomenclatureKind);

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
    formState: { errors, isSubmitting, submitCount },
  } = methods;
  const form = useRef<HTMLFormElement>(null);
  const kind = useWatch({ control, name: 'nomenclature' });
  const formalName = useWatch({ control, name: 'canonicalName' });

  // A submit's last update carries its count and every error it found, the
  // resolver's or the server's, so this runs once they are all drawn: the
  // first field marked invalid, in page order, takes the focus.
  useEffect(() => {
    if (submitCount > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submitCount]);

  const mutation = useMutation({
    mutationFn: (input: IngredientFormInput) =>
      graphqlRequest(CreateWorkspaceIngredientDocument, { workspaceId, input }),
  });

  const save = async (input: IngredientFormInput): Promise<void> => {
    try {
      const { createWorkspaceIngredient } = await mutation.mutateAsync(input);
      onSaved?.(createWorkspaceIngredient);
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
      <form ref={form} className="form ingredient-form" onSubmit={handleSubmit(save)} noValidate>
        {errors.root && (
          <p className="notice notice--error" role="alert">
            {errors.root.message}
          </p>
        )}
        <TextField
          name="name"
          label="Name"
          required
          hint="What this coven calls it. It can differ from the formal name."
        />
        {/* Each of the pair decides the other's error, so a change to one
            revalidates both, and each is marked required while the other
            makes it so: a named kind needs its formal name, and a formal
            name needs its kind. A nameless kind takes no formal name at all,
            so choosing one empties the field and shuts it, with the reason in
            view rather than in a tip: a shut field that does not say why
            reads as broken. */}
        <SelectField
          name="nomenclature"
          label="Classification"
          hint='Botanical for a plant, mineral for a stone, and so on. "Unknown" and "None" take no formal name.'
          placeholder="Choose a classification"
          options={NOMENCLATURE_OPTIONS}
          required={formalName.trim() !== ''}
          deps={['canonicalName']}
          onChange={(value) => {
            if (isNameless(value)) setValue('canonicalName', '');
          }}
        />
        <TextField
          name="canonicalName"
          label="Formal Name"
          hint="Its name in the classification's own system: Lavandula angustifolia, Quartz var. amethyst, Sodium chloride."
          note={
            isNameless(kind)
              ? `${kind === 'unknown' ? 'An' : 'A'} "${kind}" entry records no formal name.`
              : undefined
          }
          disabled={isNameless(kind)}
          required={kind !== '' && !isNameless(kind)}
          deps={['nomenclature']}
        />
        <TextField name="form" label="Form" hint="How it comes: dried leaf, whole root, oil." />
        <ListField
          name="folkNames"
          legend="Folk Names"
          entry="Folk Name"
          hint="Other names it goes by. A search finds it by any of them."
        />
        <TextField name="description" label="Description" multiline />
        <SelectField name="element" label="Element" none="None" options={ELEMENT_OPTIONS} />
        <TextField
          name="planet"
          label="Planet"
          hint="The heavenly body it answers to: a planet, the Sun or the Moon."
        />
        <TextField name="zodiac" label="Zodiac Sign" />
        <TextField
          name="color"
          label="Colour"
          hint="The colour it corresponds to in a working, not the colour it is."
        />
        <ListField
          name="deities"
          legend="Deities"
          entry="Deity"
          hint="The gods and spirits it is sacred to."
        />
        <ListField
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
          <button type="submit" className="btn btn--solid" disabled={isSubmitting}>
            Save Ingredient
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

export default IngredientForm;
