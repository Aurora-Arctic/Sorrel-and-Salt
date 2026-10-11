import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor as waitForDom,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES, EMPTY_VARIANT } from '@/components/IngredientForm/values';
import type {
  CreateCompendiumIngredientMutation,
  CreateCompendiumIngredientMutationVariables,
  CreateWorkspaceIngredientMutation,
  CreateWorkspaceIngredientMutationVariables,
  UpdateCompendiumIngredientMutation,
  UpdateCompendiumIngredientMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';
import {
  WORKSPACE_ID,
  offerDeities,
  offerDuplicates,
  offerForms,
  offerIngredients,
  offerNames,
  offerPlanets,
  offerReferences,
  offerSigns,
} from '../../support/msw/ingredient-lookups';
import type { FormNode, IngredientNode } from './types';

// The form's Variants section (MB.221): an entry's forms, each a fieldset of
// its own fields beneath the ingredient's, added from the New Form box and
// removed by its own button. The whole form is rendered, since what the
// section adds is what the save sends and where an issue lands; a field
// inside a variant behaves as the same field does on the ingredient, which
// index.test.tsx and the fields' own files prove
// (claude-docs/components/ingredient-form.md, "The variants").

const ENTRY_ID = '3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93';
const OIL_ID = '8d2c4e6f-1a3b-4c5d-9e7f-0a1b2c3d4e5f';
const HERB_VARIANT_ID = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

/** A curated form, Oil, under an invented group. */
const OIL: FormNode = {
  id: OIL_ID,
  value: 'Oil',
  description: null,
  group: 'Preparation',
  curated: true,
  claimants: [],
};

/** Invented substitutes (M1.25): one in no form, one in a form of Oil's group, one in oil itself. */
const PLAINWORT_ID = '2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d';
const TINCTWORT_ID = '3b4c5d6e-7f8a-4b9c-8d0e-2f3a4b5c6d7e';
const OILWORT_ID = '4c5d6e7f-8a9b-4c0d-9e1f-3a4b5c6d7e8f';
const OILWORT_OIL_ID = '5d6e7f8a-9b0c-4d1e-8f2a-4b5c6d7e8f9a';
const substitute = (
  id: string,
  name: string,
  variants: IngredientNode['variants'],
): IngredientNode => ({
  id,
  name,
  canonicalName: null,
  form: null,
  description: null,
  isGlobal: true,
  variants,
});
const SUBSTITUTES = [
  substitute(PLAINWORT_ID, 'Plainwort', []),
  substitute(TINCTWORT_ID, 'Tinctwort', [
    {
      id: '6e7f8a9b-0c1d-4e2f-9a3b-5c6d7e8f9a0b',
      form: 'Tincture',
      formChoice: {
        id: '7f8a9b0c-1d2e-4f3a-8b4c-6d7e8f9a0b1c',
        group: { id: 'g', name: 'Preparation' },
      },
    },
  ]),
  substitute(OILWORT_ID, 'Oilwort', [{ id: OILWORT_OIL_ID, form: ' OIL', formChoice: null }]),
];

/** Every lookup answered empty; a test about one answers it after rendering. */
function offerNothing() {
  offerForms([]);
  offerNames([]);
  offerPlanets([]);
  offerSigns([]);
  offerDeities([]);
  offerIngredients([]);
  offerReferences([]);
  offerDuplicates([]);
  mockGraphQLQuery<Record<string, unknown>>('PickerCategories', () => ({
    categories: { edges: [] },
  }));
  mockGraphQLQuery<Record<string, unknown>>('CompendiumSubstitutes', () => ({
    compendium: { edges: [] },
  }));
}

function renderForm(
  props: { workspaceId: string } | { workspaceId: null; values?: IngredientFormValues },
) {
  offerNothing();
  const onSaved = vi.fn();
  const form =
    props.workspaceId === null ? (
      <IngredientForm
        workspaceId={null}
        onSaved={onSaved}
        entry={props.values && { id: ENTRY_ID, values: props.values }}
      />
    ) : (
      <IngredientForm workspaceId={props.workspaceId} onSaved={onSaved} />
    );
  render(<QueryClientProvider client={makeQueryClient()}>{form}</QueryClientProvider>);
  return onSaved;
}

/** RTL's waitFor polled every 5 ms, as index.test.tsx's is (MB.181). */
const waitFor: typeof waitForDom = (callback, options) =>
  waitForDom(callback, { interval: 5, ...options });

// Found by label, as index.test.tsx finds them (MB.181): a role query names
// every element of the role in a form this long. The required marker, hidden
// from the name, is dropped from the label's text.
const byLabel = (scope: HTMLElement, name: string, selector: string) =>
  within(scope).getByLabelText(name, {
    selector,
    normalizer: (text) => text.replace(/\*$/, '').trim(),
  });
const control = (scope: HTMLElement, name: string) =>
  byLabel(scope, name, 'input:not([role]), textarea, [role="combobox"]');
const type = (scope: HTMLElement, name: string, value: string) =>
  fireEvent.change(control(scope, name), { target: { value } });
const newForm = () => control(document.body, 'New Form');

/** The fieldset a variant is, named by its form. */
const variant = (form: string) => screen.getByRole('group', { name: form });
const noVariant = (form: string) =>
  expect(screen.queryByRole('group', { name: form })).not.toBeInTheDocument();

/** Types a form into the New Form box and presses its Add. */
const addVariant = (form: string) => {
  type(document.body, 'New Form', form);
  fireEvent.click(screen.getByLabelText('Add Variant', { selector: 'button' }));
};

const save = () => {
  const button = screen.getByRole('button', { name: 'Save Ingredient' });
  button.focus();
  fireEvent.click(button);
};

function acceptCreate() {
  const calls: CreateWorkspaceIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    CreateWorkspaceIngredientMutation,
    CreateWorkspaceIngredientMutationVariables
  >('CreateWorkspaceIngredient', (variables) => {
    calls.push(variables);
    return { createWorkspaceIngredient: { id: 'saved-1', name: variables.input.name, slug: 's' } };
  });
  return calls;
}

function acceptCompendiumCreate() {
  const calls: CreateCompendiumIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    CreateCompendiumIngredientMutation,
    CreateCompendiumIngredientMutationVariables
  >('CreateCompendiumIngredient', (variables) => {
    calls.push(variables);
    return { createCompendiumIngredient: { id: ENTRY_ID, name: variables.input.name, slug: 's' } };
  });
  return calls;
}

function acceptUpdate() {
  const calls: UpdateCompendiumIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    UpdateCompendiumIngredientMutation,
    UpdateCompendiumIngredientMutationVariables
  >('UpdateCompendiumIngredient', (variables) => {
    calls.push(variables);
    return {
      updateCompendiumIngredient: { id: ENTRY_ID, name: variables.input.name, slug: 's' },
    };
  });
  return calls;
}

describe('IngredientForm’s variants', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists a variant added from the New Form box as its own fieldset, and sends it as variants, never form', async () => {
    const calls = acceptCreate();
    renderForm({ workspaceId: WORKSPACE_ID });

    type(document.body, 'Name', 'Testwort');
    addVariant('Oil');
    const oil = variant('Oil');
    expect(control(oil, 'Form')).toHaveValue('Oil');
    expect(newForm()).toHaveValue('');
    type(oil, 'Safety Notes', 'Dilute before use.');
    save();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].input.variants).toEqual([
      {
        form: 'Oil',
        formId: '',
        description: '',
        safetyNotes: 'Dilute before use.',
        elements: [],
        planets: [],
        zodiacSigns: [],
        colors: [],
        categoryIds: [],
        substitutes: [],
        references: [],
      },
    ]);
    expect(calls[0].input).not.toHaveProperty('form');
    expect(calls[0].input).not.toHaveProperty('formId');
  });

  it('adds a curated form picked on the compendium, the variant’s Form field carrying the pick', async () => {
    const calls = acceptCompendiumCreate();
    renderForm({ workspaceId: null });
    const asks = offerForms([OIL]);

    act(() => newForm().focus());
    await waitFor(() => expect(asks.length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Show New Form suggestions' }));
    fireEvent.click(await screen.findByRole('option', { name: /^Oil \(Preparation\)/ }));

    const form = control(variant('Oil'), 'Form');
    expect(form).toHaveValue('Oil');
    expect(form).toHaveAccessibleDescription(expect.stringContaining('Preparation'));
    expect(asks[0].workspaceId).toBeNull();

    type(document.body, 'Name', 'Testwort');
    fireEvent.click(screen.getByRole('combobox', { name: 'Classification' }));
    fireEvent.click(screen.getByRole('option', { name: 'None' }));
    save();
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].input.variants).toEqual([
      expect.objectContaining({ form: 'Oil', formId: OIL_ID }),
    ]);
  });

  it('marks a compendium variant’s typed form invalid beside its Form box, focused, and sends nothing', async () => {
    const calls = acceptUpdate();
    renderForm({
      workspaceId: null,
      values: {
        ...EMPTY_VALUES,
        name: 'Testwort',
        nomenclature: 'none',
        variants: [
          {
            ...EMPTY_VARIANT,
            variantId: HERB_VARIANT_ID,
            form: 'Oil',
            formLink: { id: OIL_ID, name: 'Oil', group: 'Preparation', description: null },
          },
        ],
      },
    });

    const form = control(variant('Oil'), 'Form');
    fireEvent.change(form, { target: { value: 'Oyl' } });
    save();

    await waitFor(() => expect(form).toBeInvalid());
    expect(form).toHaveFocus();
    expect(calls).toHaveLength(0);
  });

  it('refuses text the compendium’s New Form box has not picked, at Enter, adding nothing', () => {
    renderForm({ workspaceId: null });

    type(document.body, 'New Form', 'Oyl');
    fireEvent.keyDown(newForm(), { key: 'Enter' });

    expect(newForm()).toBeInvalid();
    noVariant('Oyl');
  });

  it('removes a variant by its own button, and sends the rest', async () => {
    const calls = acceptCreate();
    renderForm({ workspaceId: WORKSPACE_ID });

    type(document.body, 'Name', 'Testwort');
    addVariant('Oil');
    addVariant('Herb');
    fireEvent.click(within(variant('Oil')).getByRole('button', { name: 'Remove Oil' }));

    noVariant('Oil');
    expect(variant('Herb')).toBeInTheDocument();
    save();
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].input.variants?.map(({ form }) => form)).toEqual(['Herb']);
  });

  it('refuses a repeat form at Add, folded as the save folds it, adding no second fieldset', () => {
    renderForm({ workspaceId: WORKSPACE_ID });

    addVariant('Oil');
    addVariant('  oIL ');

    expect(screen.getAllByRole('group', { name: /oil/i })).toHaveLength(1);
    expect(newForm()).toBeInvalid();
    expect(newForm()).toHaveValue('  oIL ');
  });

  it('marks the field a server issue pathed to variants.1.form names, and only that one', async () => {
    mockGraphQLError('CreateWorkspaceIngredient', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['variants', 1, 'form'], message: 'No such form to pick' }],
    });
    renderForm({ workspaceId: WORKSPACE_ID });

    type(document.body, 'Name', 'Testwort');
    addVariant('Oil');
    addVariant('Herb');
    save();

    const herb = control(variant('Herb'), 'Form');
    await waitFor(() => expect(herb).toBeInvalid());
    expect(herb).toHaveFocus();
    expect(control(variant('Oil'), 'Form')).not.toBeInvalid();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('opens an entry’s variants as fieldsets and saves each back by its id', async () => {
    const calls = acceptUpdate();
    renderForm({
      workspaceId: null,
      values: {
        ...EMPTY_VALUES,
        name: 'Testwort',
        nomenclature: 'none',
        variants: [
          {
            ...EMPTY_VARIANT,
            variantId: HERB_VARIANT_ID,
            form: 'Oil',
            formLink: { id: OIL_ID, name: 'Oil', group: 'Preparation', description: null },
            safetyNotes: 'Dilute before use.',
          },
        ],
      },
    });

    type(variant('Oil'), 'Description', 'Pressed from the fixture.');
    save();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].input.variants).toEqual([
      expect.objectContaining({
        id: HERB_VARIANT_ID,
        form: 'Oil',
        formId: OIL_ID,
        description: 'Pressed from the fixture.',
        safetyNotes: 'Dilute before use.',
      }),
    ]);
  });

  describe('a variant’s substitutes', () => {
    /** Picks Oil from the New Form box, so the variant carries Oil's group. */
    async function addOil() {
      const forms = offerForms([OIL]);
      act(() => newForm().focus());
      await waitFor(() => expect(forms.length).toBeGreaterThan(0));
      fireEvent.click(screen.getByRole('button', { name: 'Show New Form suggestions' }));
      fireEvent.click(await screen.findByRole('option', { name: /^Oil \(Preparation\)/ }));
      return variant('Oil');
    }
    /** Opens a variant's substitute box on the lookup's answer. */
    async function openSubstitutes(oil: HTMLElement) {
      const asks = offerIngredients(SUBSTITUTES);
      const box = control(oil, 'Substitute Ingredient');
      act(() => box.focus());
      await waitFor(() => expect(asks.length).toBeGreaterThan(0));
      fireEvent.click(
        within(oil).getByRole('button', { name: 'Show Substitute Ingredient suggestions' }),
      );
      return within(oil).findByRole('listbox', { name: 'Substitute Ingredient suggestions' });
    }

    it('ranks an ingredient in the same form first, then one in its group, then the rest', async () => {
      renderForm({ workspaceId: WORKSPACE_ID });

      const list = await openSubstitutes(await addOil());

      await waitFor(() => within(list).getByRole('option', { name: /^Plainwort/ }));
      const named = within(list)
        .getAllByRole('option')
        .map((option) => option.textContent ?? '');
      expect(named.map((text) => text.match(/^(Plainwort|Tinctwort|Oilwort)/)?.[0])).toEqual([
        'Oilwort',
        'Tinctwort',
        'Plainwort',
      ]);
    });

    it('names the linked ingredient’s form chosen in its second picker, sent as substituteVariantId', async () => {
      const calls = acceptCreate();
      renderForm({ workspaceId: WORKSPACE_ID });
      type(document.body, 'Name', 'Testwort');
      const oil = await addOil();

      const list = await openSubstitutes(oil);
      fireEvent.click(await within(list).findByRole('option', { name: /^Oilwort/ }));
      fireEvent.click(control(oil, 'Form of Oilwort'));
      fireEvent.click(
        within(screen.getByRole('listbox', { name: 'Form of Oilwort choices' })).getByRole(
          'option',
          { name: 'OIL' },
        ),
      );
      save();

      // The pill tells the form chosen.
      expect(
        within(oil).getByRole('button', { name: 'Remove Oilwort' }),
      ).toHaveAccessibleDescription(expect.stringContaining('OIL'));
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0].input.variants?.[0]?.substitutes).toEqual([
        { ingredientId: OILWORT_ID, substituteVariantId: OILWORT_OIL_ID },
      ]);
    });
  });
});
