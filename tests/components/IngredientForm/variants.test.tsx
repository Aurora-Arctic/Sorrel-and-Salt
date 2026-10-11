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
import { VARIANT_SECTIONS, openSections, openSectionsIn } from '../../support/ingredient-sections';
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
const HERB_FORM_ID = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b';

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
  // An edit opens with every section closed (MB.115): its variants are what
  // these tests work in.
  if (props.workspaceId === null && props.values) openSections('Variants');
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

/** A variant's Edit, which opens and closes it (MB.115). */
const editOf = (form: string) =>
  within(variant(form)).getByRole('button', { name: `Edit ${form}` });
/** Opens a closed variant by its Edit, as a person would before typing in it. */
const openVariant = (form: string) => {
  const edit = editOf(form);
  if (edit.getAttribute('aria-expanded') !== 'true') fireEvent.click(edit);
  return variant(form);
};
/** Opens a closed variant and every one of its own sections, closed as an edit's are (MB.115). */
const openWhole = (form: string) => {
  const card = openVariant(form);
  openSectionsIn(card, ...VARIANT_SECTIONS);
  return card;
};
/** A variant's section heading's button, which opens and closes it. */
const sectionOf = (card: HTMLElement, title: string) =>
  within(card).getByRole('button', { name: title });
/** Which of a variant's sections are open, by title, in page order. */
const openIn = (card: HTMLElement) =>
  VARIANT_SECTIONS.filter(
    (title) => sectionOf(card, title).getAttribute('aria-expanded') === 'true',
  );
/** An entry with two closed forms, Oil and Herb, Oil carrying a colour left in its box. */
const twoForms = (oil: Partial<IngredientFormValues['variants'][number]> = {}) => ({
  ...EMPTY_VALUES,
  name: 'Testwort',
  nomenclature: 'none' as const,
  variants: [
    {
      ...EMPTY_VARIANT,
      variantId: HERB_VARIANT_ID,
      form: 'Oil',
      formLink: { id: OIL_ID, name: 'Oil', group: 'Preparation', description: null },
      ...oil,
    },
    {
      ...EMPTY_VARIANT,
      form: 'Herb',
      formLink: { id: HERB_FORM_ID, name: 'Herb', group: 'Plant part', description: null },
    },
  ],
});

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

  it('lists a variant added from the New Form box as its own fieldset, and sends it as a variant', async () => {
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

    const form = control(openVariant('Oil'), 'Form');
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
    // The newest first, so Herb is the second.
    addVariant('Herb');
    addVariant('Oil');
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

    type(openVariant('Oil'), 'Description', 'Pressed from the fixture.');
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

  // MB.115, the owner's call: each variant one summary line, opened by its
  // Edit, one at a time, its fields hidden while closed but kept.
  describe('folded to a line', () => {
    it('opens an entry with every variant closed, its fields out of reach until Edit opens it', () => {
      renderForm({ workspaceId: null, values: twoForms() });

      const edit = editOf('Oil');
      expect(edit).toHaveAttribute('aria-expanded', 'false');
      expect(edit).toHaveAccessibleDescription(/\S/);
      expect(within(variant('Oil')).queryByRole('textbox', { name: 'Safety Notes' })).toBeNull();
      expect(editOf('Herb')).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(edit);

      expect(edit).toHaveAttribute('aria-expanded', 'true');
      const region = document.getElementById(edit.getAttribute('aria-controls') ?? '');
      expect(region).toBeVisible();
      // The focus goes into the opened fields, to the first: Identity's
      // heading, its section closed as an edit's are (MB.115).
      expect(sectionOf(variant('Oil'), 'Identity')).toHaveFocus();
      openSectionsIn(variant('Oil'), 'Safety');
      expect(within(variant('Oil')).getByRole('textbox', { name: 'Safety Notes' })).toBeVisible();
    });

    it('closes on Done, the focus back on its Edit, and keeps what was typed', () => {
      renderForm({ workspaceId: null, values: twoForms() });

      const oil = openVariant('Oil');
      openSectionsIn(oil, 'Safety');
      type(oil, 'Safety Notes', 'Dilute before use.');
      fireEvent.click(within(oil).getByRole('button', { name: 'Done with Oil' }));

      expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'false');
      expect(editOf('Oil')).toHaveFocus();
      expect(within(oil).queryByRole('textbox', { name: 'Safety Notes' })).toBeNull();
      expect(within(openVariant('Oil')).getByRole('textbox', { name: 'Safety Notes' })).toHaveValue(
        'Dilute before use.',
      );
    });

    // MB.115, the owner's call: an open variant's fields in the ingredient's sections.
    it('groups an open variant’s fields under the ingredient’s section headings, a level beneath Variants', () => {
      renderForm({ workspaceId: null, values: twoForms() });

      const oil = openVariant('Oil');

      const headings = within(oil).getAllByRole('heading', { level: 4 });
      expect(headings.map((heading) => heading.textContent)).toEqual([
        'Identity',
        'Description',
        'Correspondences',
        'Relations',
        'Safety',
        'Sources',
      ]);
      expect(within(oil).queryByRole('heading', { level: 3 })).toBeNull();
      // Each field sits in its own section, found by its label as before.
      const sectionOf = (element: HTMLElement) => element.closest('section');
      expect(sectionOf(control(oil, 'Form'))).toBe(sectionOf(headings[0]));
      expect(sectionOf(control(oil, 'Description'))).toBe(sectionOf(headings[1]));
      expect(sectionOf(control(oil, 'Planet'))).toBe(sectionOf(headings[2]));
      expect(sectionOf(control(oil, 'Substitute Ingredient'))).toBe(sectionOf(headings[3]));
      expect(sectionOf(control(oil, 'Safety Notes'))).toBe(sectionOf(headings[4]));
    });

    it('keeps one variant open at a time', () => {
      renderForm({ workspaceId: null, values: twoForms() });

      openVariant('Oil');
      fireEvent.click(editOf('Herb'));

      expect(editOf('Herb')).toHaveAttribute('aria-expanded', 'true');
      expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens a variant as Add Variant adds it, closing the one open', () => {
      renderForm({ workspaceId: WORKSPACE_ID });

      addVariant('Oil');
      expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'true');
      addVariant('Herb');

      expect(editOf('Herb')).toHaveAttribute('aria-expanded', 'true');
      expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'false');
      // The New Form box keeps the focus, ready for the next.
      expect(newForm()).toHaveFocus();
    });

    // MB.115, the owner's call: the box heads the section, the newest variant beneath it.
    it('lists a variant added beneath the New Form box, ahead of those before it', () => {
      renderForm({ workspaceId: WORKSPACE_ID });

      addVariant('Oil');
      addVariant('Herb');

      const cards = screen.getAllByRole('group', { name: /^(Oil|Herb)$/ });
      expect(cards).toEqual([variant('Herb'), variant('Oil')]);
      expect(
        newForm().compareDocumentPosition(cards[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('opens a closed variant a save finds an error in, its field focused, and sends nothing', async () => {
      const calls = acceptUpdate();
      renderForm({
        workspaceId: null,
        values: twoForms({ drafts: { ...EMPTY_VARIANT.drafts, colors: 'Fixture Red' } }),
      });
      fireEvent.click(editOf('Herb'));
      type(variant('Herb'), 'Description', 'Dug in autumn.');

      save();

      await waitFor(() => expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'true'));
      const colour = control(variant('Oil'), 'Colour');
      expect(colour).toBeInvalid();
      expect(colour).toHaveFocus();
      expect(editOf('Herb')).toHaveAttribute('aria-expanded', 'false');
      expect(calls).toHaveLength(0);
    });
  });

  // MB.115, the owner's ask: an open variant's sections fold as the
  // ingredient's do, under its own headings.
  describe('a variant’s sections', () => {
    it('opens an existing variant with every section closed, each summarising what it holds', () => {
      renderForm({
        workspaceId: null,
        values: twoForms({ safetyNotes: 'Dilute before use.', planets: [{ value: 'Venus' }] }),
      });

      const oil = openVariant('Oil');

      expect(openIn(oil)).toEqual([]);
      for (const title of VARIANT_SECTIONS)
        expect(sectionOf(oil, title)).toHaveAccessibleDescription(/\S/);
      expect(sectionOf(oil, 'Safety')).toHaveAccessibleDescription(/Dilute before use\./);
      expect(sectionOf(oil, 'Correspondences')).toHaveAccessibleDescription(/Venus/);
      expect(within(oil).queryByRole('textbox', { name: 'Safety Notes' })).toBeNull();
    });

    it('opens a variant added here with every section open, its fields in view', () => {
      renderForm({ workspaceId: WORKSPACE_ID });

      addVariant('Oil');

      const oil = variant('Oil');
      expect(openIn(oil)).toEqual(VARIANT_SECTIONS);
      expect(within(oil).getByRole('textbox', { name: 'Safety Notes' })).toBeVisible();
    });

    it('opens and closes one section by its heading, leaving the variant’s others and the ingredient’s alone', () => {
      renderForm({ workspaceId: null, values: twoForms() });
      const oil = openVariant('Oil');

      fireEvent.click(sectionOf(oil, 'Correspondences'));

      expect(openIn(oil)).toEqual(['Correspondences']);
      expect(control(oil, 'Planet')).toBeVisible();
      // The ingredient's own Correspondences, a level up, stays closed.
      expect(screen.getAllByRole('button', { name: 'Correspondences' })[0]).toHaveAttribute(
        'aria-expanded',
        'false',
      );

      fireEvent.click(sectionOf(oil, 'Correspondences'));
      expect(openIn(oil)).toEqual([]);
    });

    it('opens the closed section a save finds the schema’s error in, in the variant it opens, its field focused', async () => {
      const calls = acceptUpdate();
      renderForm({
        workspaceId: null,
        values: twoForms({ drafts: { ...EMPTY_VARIANT.drafts, colors: 'Fixture Red' } }),
      });
      const herb = openVariant('Herb');
      openSectionsIn(herb, 'Description');
      type(herb, 'Description', 'Dug in autumn.');

      save();

      await waitFor(() => expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'true'));
      const oil = variant('Oil');
      expect(openIn(oil)).toEqual(['Correspondences']);
      const colour = control(oil, 'Colour');
      expect(colour).toBeVisible();
      expect(colour).toHaveFocus();
      expect(calls).toHaveLength(0);
    });

    it('opens the closed section the server refuses a variant’s field in, its field focused', async () => {
      mockGraphQLError('UpdateCompendiumIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['variants', 0, 'safetyNotes'], message: 'Too long' }],
      });
      renderForm({ workspaceId: null, values: twoForms() });
      const herb = openVariant('Herb');
      openSectionsIn(herb, 'Description');
      type(herb, 'Description', 'Dug in autumn.');

      save();

      await waitFor(() => expect(editOf('Oil')).toHaveAttribute('aria-expanded', 'true'));
      const oil = variant('Oil');
      expect(openIn(oil)).toEqual(['Safety']);
      const notes = within(oil).getByRole('textbox', { name: 'Safety Notes' });
      expect(notes).toBeInvalid();
      expect(notes).toHaveFocus();
    });

    it('opens Relations on a save refusing a substitute link that names no form', async () => {
      const calls = acceptUpdate();
      renderForm({
        workspaceId: null,
        values: twoForms({
          substitutes: [
            {
              value: 'Plainwort',
              link: {
                id: PLAINWORT_ID,
                canonicalName: null,
                forms: [],
                description: null,
                isGlobal: true,
                variants: [],
              },
            },
          ],
        }),
      });
      const oil = openVariant('Oil');
      type(oil, 'Description', 'A fixture oil.');

      save();

      await waitFor(() => expect(openIn(oil)).toEqual(['Relations']));
      expect(control(oil, 'Substitute Ingredient')).toBeVisible();
      expect(calls).toHaveLength(0);
    });

    it('closes every variant’s sections with Close All, and opens every one with Open All', () => {
      renderForm({ workspaceId: null, values: twoForms() });
      const oil = openVariant('Oil');
      fireEvent.click(sectionOf(oil, 'Correspondences'));

      fireEvent.click(screen.getByRole('button', { name: 'Close All' }));
      openSections('Variants');
      expect(openIn(variant('Oil'))).toEqual([]);

      // Variants open, so the control reads Close All: closed first, then opened.
      fireEvent.click(screen.getByRole('button', { name: 'Close All' }));
      fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
      expect(openIn(variant('Oil'))).toEqual(VARIANT_SECTIONS);
      expect(within(variant('Oil')).getByRole('textbox', { name: 'Safety Notes' })).toBeVisible();
    });
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

      await waitFor(() => within(list).getByRole('option', { name: /^Tinctwort/ }));
      const named = within(list)
        .getAllByRole('option')
        .map((option) => option.textContent ?? '');
      expect(named.map((text) => text.match(/^(Plainwort|Tinctwort|Oilwort)/)?.[0])).toEqual([
        'Oilwort',
        'Tinctwort',
      ]);
    });

    // MB.115, the owner's calls: a variant's substitute is picked form by
    // form, and a link always names one.
    it('offers an ingredient only as its forms, one row each, and one in no form not at all', async () => {
      renderForm({ workspaceId: WORKSPACE_ID });

      const list = await openSubstitutes(await addOil());

      await waitFor(() => within(list).getByRole('option', { name: /^Tinctwort/ }));
      // Tinctwort and Oilwort come in one form each: that form's row alone.
      expect(within(list).getAllByRole('option')).toHaveLength(2);
      expect(within(list).getAllByRole('option', { name: /^Tinctwort · Tincture/ })).toHaveLength(
        1,
      );
      expect(within(list).getAllByRole('option', { name: /^Oilwort · OIL/ })).toHaveLength(1);
      // Plainwort comes in none: nothing of it to link.
      expect(within(list).queryByRole('option', { name: /^Plainwort/ })).toBeNull();
      // There is no second picker to name a form with.
      expect(within(variant('Oil')).queryByRole('combobox', { name: /^Form of / })).toBeNull();
    });

    it('links the form a row names, sent as substituteVariantId, its pill naming the form', async () => {
      const calls = acceptCreate();
      renderForm({ workspaceId: WORKSPACE_ID });
      type(document.body, 'Name', 'Testwort');
      const oil = await addOil();

      const list = await openSubstitutes(oil);
      fireEvent.click(await within(list).findByRole('option', { name: /^Oilwort · / }));
      save();

      // One pill, for Oilwort's form rather than Oilwort whole.
      expect(within(oil).getAllByRole('button', { name: /^Remove Oilwort/ })).toHaveLength(1);
      expect(within(oil).queryByRole('button', { name: 'Remove Oilwort' })).toBeNull();
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0].input.variants?.[0]?.substitutes).toEqual([
        { ingredientId: OILWORT_ID, substituteVariantId: OILWORT_OIL_ID },
      ]);
    });

    it('adds typed text as a name only, linking nothing', async () => {
      const calls = acceptCreate();
      renderForm({ workspaceId: WORKSPACE_ID });
      type(document.body, 'Name', 'Testwort');
      const oil = await addOil();

      type(oil, 'Substitute Ingredient', 'Plainwort');
      fireEvent.click(within(oil).getByRole('button', { name: 'Add Substitute Ingredient' }));
      save();

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0].input.variants?.[0]?.substitutes).toEqual([{ name: 'Plainwort' }]);
    });

    // Old data, from before a link had to name a form: the chip stays to be
    // read, and the save is refused beside it until it is replaced.
    it('refuses a save holding a link that names no form, the error on that entry alone', async () => {
      const calls = acceptUpdate();
      renderForm({
        workspaceId: null,
        values: twoForms({
          substitutes: [
            { value: 'Fixture moss' },
            {
              value: 'Plainwort',
              link: {
                id: PLAINWORT_ID,
                canonicalName: null,
                forms: [],
                description: null,
                isGlobal: true,
                variants: [],
              },
            },
          ],
        }),
      });
      const oil = openVariant('Oil');
      const remove = (name: string) => within(oil).getByRole('button', { name: `Remove ${name}` });
      const described = (element: HTMLElement) =>
        element.getAttribute('aria-describedby')?.split(' ') ?? [];
      type(oil, 'Description', 'A fixture oil.');

      save();

      const box = control(oil, 'Substitute Ingredient');
      await waitFor(() => expect(box).toHaveAttribute('aria-invalid', 'true'));
      const [errorId] = described(remove('Plainwort'));
      expect(described(box)).toContain(errorId);
      expect(described(remove('Fixture moss'))).not.toContain(errorId);
      expect(calls).toHaveLength(0);

      // Why: the same save, the formless link removed, goes.
      fireEvent.click(remove('Plainwort'));
      save();
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0].input.variants?.[0]?.substitutes).toEqual([{ name: 'Fixture moss' }]);
    });

    it('never offers the variant itself as its own substitute, its sibling forms still offered', async () => {
      renderForm({ workspaceId: null, values: twoForms() });
      const asks: unknown[] = [];
      mockGraphQLQuery<Record<string, unknown>>('CompendiumSubstitutes', () => {
        asks.push(true);
        return {
          compendium: {
            edges: [
              {
                node: substitute(ENTRY_ID, 'Testwort', [
                  { id: HERB_VARIANT_ID, form: 'Oil', formChoice: null },
                  { id: OILWORT_OIL_ID, form: 'Herb', formChoice: null },
                ]),
              },
            ],
          },
        };
      });
      const oil = openVariant('Oil');
      openSectionsIn(oil, 'Relations');

      act(() => control(oil, 'Substitute Ingredient').focus());
      await waitFor(() => expect(asks.length).toBeGreaterThan(0));
      fireEvent.click(
        within(oil).getByRole('button', { name: 'Show Substitute Ingredient suggestions' }),
      );
      const list = await within(oil).findByRole('listbox', {
        name: 'Substitute Ingredient suggestions',
      });

      await waitFor(() => within(list).getByRole('option', { name: /^Testwort · Herb/ }));
      expect(within(list).queryByRole('option', { name: /^Testwort · Oil/ })).toBeNull();
    });
  });

  // MB.115, the owner's call: each of an open variant's fields but its form
  // fills from the ingredient's own, adding and never taking away.
  describe('copying from the ingredient', () => {
    const CATEGORY_A = '8a9b0c1d-2e3f-4b4c-8d5e-6f7a8b9c0d1e';
    const CATEGORY_B = '9b0c1d2e-3f4a-4c5d-9e6f-7a8b9c0d1e2f';
    const REFERENCE_ID = '6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c';
    const OTHER_REFERENCE_ID = '7a8b9c0d-1e2f-4a3b-9c4d-5e6f7a8b9c0d';
    const reference = (id: string, title: string, locator: string) => ({
      value: title,
      link: { id, isGlobal: true, kind: 'book' as const, title, authors: null, container: null },
      locator,
    });
    const COPIED = [
      'Description',
      'Element',
      'Planets',
      'Zodiac Signs',
      'Colours',
      'Categories',
      'Substitute Ingredients',
      'Safety Notes',
      'References',
    ];
    const copyOf = (scope: HTMLElement, field: string) =>
      within(scope).getByRole('button', { name: `Copy From Ingredient: ${field}` });

    /** An entry whose ingredient holds something in every field a variant copies, its Oil some of it already. */
    const filled = (): IngredientFormValues => {
      const base = twoForms({
        safetyNotes: 'Dilute before use.',
        planets: [{ value: 'venus' }],
        colors: [{ value: 'Fixture Red' }],
        elements: ['fire'],
        categoryIds: [CATEGORY_B],
        substitutes: [{ value: 'Fixture fern' }],
        references: [reference(OTHER_REFERENCE_ID, 'The Second Herbal', '')],
      });
      return {
        ...base,
        description: 'A fixture herb.',
        safetyNotes: 'Keep from children.',
        elements: ['fire', 'water'],
        planets: [{ value: 'Mercury' }, { value: 'Venus' }],
        zodiacSigns: [{ value: 'Gemini' }],
        colors: [{ value: 'Fixture Red' }, { value: 'Fixture Green' }],
        categoryIds: [CATEGORY_A, CATEGORY_B],
        substitutes: [
          {
            value: 'Oilwort',
            link: {
              id: OILWORT_ID,
              canonicalName: null,
              forms: [' OIL'],
              description: null,
              isGlobal: true,
              variants: [{ id: OILWORT_OIL_ID, form: ' OIL', group: null }],
            },
          },
          {
            value: 'Tinctwort',
            link: {
              id: TINCTWORT_ID,
              canonicalName: null,
              forms: ['Tincture'],
              description: null,
              isGlobal: true,
              variants: [
                { id: '6e7f8a9b-0c1d-4e2f-9a3b-5c6d7e8f9a0b', form: 'Tincture', group: null },
              ],
            },
          },
          {
            value: 'Plainwort',
            link: {
              id: PLAINWORT_ID,
              canonicalName: null,
              forms: [],
              description: null,
              isGlobal: true,
              variants: [],
            },
          },
          { value: 'Fixture moss' },
        ],
        references: [
          reference(REFERENCE_ID, 'The Fixture Herbal', 'p. 112'),
          reference(OTHER_REFERENCE_ID, 'The Second Herbal', 'p. 9'),
        ],
      };
    };

    it('gives each copied field its own button, named for the field, none of them a submit', () => {
      renderForm({ workspaceId: null, values: filled() });

      const oil = openWhole('Oil');

      const buttons = within(oil).getAllByRole('button', { name: /^Copy From Ingredient: / });
      expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(
        COPIED.map((field) => `Copy From Ingredient: ${field}`),
      );
      for (const button of buttons) expect(button).toHaveAttribute('type', 'button');
      // The ingredient's own fields have none.
      const everywhere = screen.getAllByRole('button', { name: /^Copy From Ingredient: / });
      expect(everywhere.every((button) => oil.contains(button))).toBe(true);
    });

    it('shuts each button while the ingredient’s field is empty, and opens it as the field gains a value', () => {
      renderForm({ workspaceId: null, values: twoForms() });
      const oil = openWhole('Oil');

      for (const field of COPIED) expect(copyOf(oil, field)).toBeDisabled();

      // The ingredient's own Description, the first in the page, once its section is open.
      openSections('Description');
      fireEvent.change(screen.getAllByRole('textbox', { name: 'Description' })[0], {
        target: { value: 'A fixture herb.' },
      });

      expect(copyOf(oil, 'Description')).toBeEnabled();
      expect(copyOf(oil, 'Safety Notes')).toBeDisabled();
    });

    it('adds the ingredient’s entries the variant lacks after its own, removing none, and sends them', async () => {
      const calls = acceptUpdate();
      renderForm({ workspaceId: null, values: filled() });
      const oil = openWhole('Oil');
      expect(screen.getByRole('button', { name: 'Save Ingredient' })).toBeDisabled();

      for (const field of [
        'Element',
        'Planets',
        'Zodiac Signs',
        'Colours',
        'Categories',
        'References',
      ]) {
        const button = copyOf(oil, field);
        act(() => button.focus());
        fireEvent.click(button);
        expect(button).toHaveFocus();
      }
      // Pressed again, it adds nothing more.
      fireEvent.click(copyOf(oil, 'Planets'));
      expect(
        within(oil).getByRole('status', { name: 'Planets changes' }),
      ).not.toBeEmptyDOMElement();

      expect(screen.getByRole('button', { name: 'Save Ingredient' })).toBeEnabled();
      save();
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0].input.variants?.[0]).toEqual(
        expect.objectContaining({
          elements: ['fire', 'water'],
          planets: ['venus', 'Mercury'],
          zodiacSigns: ['Gemini'],
          colors: ['Fixture Red', 'Fixture Green'],
          categoryIds: [CATEGORY_B, CATEGORY_A],
          references: [
            { referenceId: OTHER_REFERENCE_ID, locator: '' },
            { referenceId: REFERENCE_ID, locator: 'p. 112' },
          ],
        }),
      );
    });

    it('fills an empty text box with the ingredient’s text, and adds it after a blank line to a filled one', () => {
      renderForm({ workspaceId: null, values: filled() });
      const oil = openWhole('Oil');

      fireEvent.click(copyOf(oil, 'Description'));
      act(() => copyOf(oil, 'Safety Notes').focus());
      fireEvent.click(copyOf(oil, 'Safety Notes'));

      expect(control(oil, 'Description')).toHaveValue('A fixture herb.');
      expect(control(oil, 'Safety Notes')).toHaveValue('Dilute before use.\n\nKeep from children.');
      expect(copyOf(oil, 'Safety Notes')).toHaveFocus();
    });

    /** The notice beneath a variant's substitutes of what a copy skipped. */
    const skippedNotice = (scope: HTMLElement) =>
      within(scope).getByRole('status', { name: 'Substitute Ingredients skipped' });

    // MB.115, the owner's calls: Oil for Oil, and an ingredient in no such
    // form skipped, since a variant's link names a form.
    it('links each substitute’s same form, skips one in no such form and says which, and keeps a name as a name', async () => {
      const calls = acceptUpdate();
      renderForm({ workspaceId: null, values: filled() });
      const oil = openWhole('Oil');
      expect(skippedNotice(oil)).toBeEmptyDOMElement();

      fireEvent.click(copyOf(oil, 'Substitute Ingredients'));

      // Tinctwort comes in no oil, and Plainwort in no form at all.
      const notice = skippedNotice(oil);
      expect(notice).toHaveTextContent(/Tinctwort/);
      expect(notice).toHaveTextContent(/Plainwort/);
      expect(notice).not.toHaveTextContent(/Oilwort|Fixture moss/);
      expect(
        within(oil).getByRole('status', { name: 'Substitute Ingredients changes' }),
      ).toHaveTextContent(/2/);
      save();
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0].input.variants?.[0]?.substitutes).toEqual([
        { name: 'Fixture fern' },
        { ingredientId: OILWORT_ID, substituteVariantId: OILWORT_OIL_ID },
        { name: 'Fixture moss' },
      ]);
    });

    it('adds what a copy skipped as names only at Copy Anyway, the focus back on the copy', async () => {
      const calls = acceptUpdate();
      renderForm({ workspaceId: null, values: filled() });
      const oil = openWhole('Oil');
      const copy = copyOf(oil, 'Substitute Ingredients');
      fireEvent.click(copy);

      fireEvent.click(within(skippedNotice(oil)).getByRole('button', { name: 'Copy Anyway' }));

      expect(copy).toHaveFocus();
      expect(skippedNotice(oil)).toBeEmptyDOMElement();
      save();
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0].input.variants?.[0]?.substitutes).toEqual([
        { name: 'Fixture fern' },
        { ingredientId: OILWORT_ID, substituteVariantId: OILWORT_OIL_ID },
        { name: 'Fixture moss' },
        { name: 'Tinctwort' },
        { name: 'Plainwort' },
      ]);
    });

    it('takes the notice away at its dismiss, and once the list changes otherwise', () => {
      renderForm({ workspaceId: null, values: filled() });
      const oil = openWhole('Oil');
      const copy = copyOf(oil, 'Substitute Ingredients');

      fireEvent.click(copy);
      fireEvent.click(within(skippedNotice(oil)).getByRole('button', { name: 'Dismiss' }));
      expect(skippedNotice(oil)).toBeEmptyDOMElement();
      expect(copy).toHaveFocus();

      fireEvent.click(copy);
      expect(skippedNotice(oil)).not.toBeEmptyDOMElement();
      fireEvent.click(within(oil).getByRole('button', { name: 'Remove Fixture fern' }));
      expect(skippedNotice(oil)).toBeEmptyDOMElement();
    });
  });
});
