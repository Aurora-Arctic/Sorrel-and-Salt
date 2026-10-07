import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import { ListField, MultiSelectField } from '@/components/IngredientForm/fields';
import type {
  IngredientElement,
  IngredientFormInput,
  IngredientFormValues,
  SubstituteListEntry,
} from '@/components/IngredientForm/types';
import { EMPTY_VALUES, ingredientResolver } from '@/components/IngredientForm/values';
import type {
  CommonNameSuggestionsQuery,
  CommonNameSuggestionsQueryVariables,
  CreateWorkspaceIngredientMutation,
  CreateWorkspaceIngredientMutationVariables,
  FormSuggestionsQuery,
  FormSuggestionsQueryVariables,
  PlanetSuggestionsQueryVariables,
  PossibleDuplicatesQuery,
  PossibleDuplicatesQueryVariables,
} from '@/gql/graphql';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { makeQueryClient } from '@/lib/graphql-client';
import { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import {
  graphqlLink,
  mockGraphQLError,
  mockGraphQLMutation,
  mockGraphQLQuery,
} from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import { dragByPointer, layOutChips, moveByKeyboard } from '../../support/sortable';
import type {
  CategoryNode,
  CorrespondenceNode,
  DeityNode,
  DuplicateNode,
  FormNode,
  IngredientNode,
  NameNode,
} from './types';

// The ingredient entry form. The mutation is answered by MSW in the shape
// /api/graphql answers (tests/support/msw/graphql.ts), so a server error is
// the route's own mapping rather than a hand-written body
// (claude-docs/components/ingredient-form.md).

const WORKSPACE_ID = '7b0c1c3e-5f4a-4d8e-9a51-3c2f0e6d9b17';

/** Answers `FormSuggestions` with these rows, recording the variables each ask was sent with. */
function offerForms(nodes: FormNode[]) {
  const calls: FormSuggestionsQueryVariables[] = [];
  mockGraphQLQuery<FormSuggestionsQuery, FormSuggestionsQueryVariables>(
    'FormSuggestions',
    (variables) => {
      calls.push(variables);
      return { formSuggestions: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

/** Answers `CommonNameSuggestions` with these rows, recording each ask. */
function offerNames(nodes: NameNode[]) {
  const calls: CommonNameSuggestionsQueryVariables[] = [];
  mockGraphQLQuery<CommonNameSuggestionsQuery, CommonNameSuggestionsQueryVariables>(
    'CommonNameSuggestions',
    (variables) => {
      calls.push(variables);
      return { commonNameSuggestions: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

/** Answers `PossibleDuplicates` with these rows, recording each ask. */
function offerDuplicates(nodes: DuplicateNode[]) {
  const calls: PossibleDuplicatesQueryVariables[] = [];
  mockGraphQLQuery<PossibleDuplicatesQuery, PossibleDuplicatesQueryVariables>(
    'PossibleDuplicates',
    (variables) => {
      calls.push(variables);
      return { possibleDuplicates: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

/**
 * Answers one of the list boxes' lookups — `PlanetSuggestions` answering
 * `planetSuggestions`, and so on — with these rows, recording each ask. All
 * four take the same variables.
 */
function offerList<N>(operation: string, field: string, nodes: N[]) {
  const calls: PlanetSuggestionsQueryVariables[] = [];
  mockGraphQLQuery<Record<string, unknown>, PlanetSuggestionsQueryVariables>(
    operation,
    (variables) => {
      calls.push(variables);
      return { [field]: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

const offerPlanets = (nodes: CorrespondenceNode[]) =>
  offerList('PlanetSuggestions', 'planetSuggestions', nodes);
const offerSigns = (nodes: CorrespondenceNode[]) =>
  offerList('ZodiacSuggestions', 'zodiacSuggestions', nodes);
const offerDeities = (nodes: DeityNode[]) =>
  offerList('DeitySuggestions', 'deitySuggestions', nodes);
const offerIngredients = (nodes: IngredientNode[]) =>
  offerList('IngredientSuggestions', 'ingredientSuggestions', nodes);

/** Answers `PickerCategories` with these rows, as the one page the picker reads, or refuses it. */
function offerCategories(nodes: CategoryNode[] | 'refused') {
  if (nodes === 'refused') return mockGraphQLError('PickerCategories', { code: 'FORBIDDEN' });
  mockGraphQLQuery<Record<string, unknown>>('PickerCategories', () => ({
    categories: { edges: nodes.map((node) => ({ node })) },
  }));
}

/**
 * Renders the form with every lookup answered empty; a test about a lookup
 * answers it after rendering, since the later answer wins. The categories are
 * read as the form opens, so a test about them passes them in.
 */
function renderForm({ categories = [] }: { categories?: CategoryNode[] | 'refused' } = {}) {
  const onSaved = vi.fn();
  offerCategories(categories);
  offerForms([]);
  offerNames([]);
  offerPlanets([]);
  offerSigns([]);
  offerDeities([]);
  offerIngredients([]);
  offerList('ReferenceSuggestions', 'referenceSuggestions', []);
  offerDuplicates([]);
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <IngredientForm workspaceId={WORKSPACE_ID} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return onSaved;
}

const textbox = (name: string) => screen.getByRole('textbox', { name });
/** A suggesting box: the form field, or a list's. A closed set's box is a combobox too, select-only. */
const box = (name: string) => screen.getByRole('combobox', { name });
const select = box;
const control = (name: string) =>
  screen.queryByRole('textbox', { name }) ?? screen.getByRole('combobox', { name });
const type = (name: string, value: string) =>
  fireEvent.change(control(name), { target: { value } });
/** Opens a closed set's box and picks the choice reading `label`. */
const choose = (name: string, label: string) => {
  fireEvent.click(select(name));
  fireEvent.click(
    within(screen.getByRole('listbox', { name: `${name} choices` })).getByRole('option', {
      name: label,
    }),
  );
};
/** Opens a multi-select's box, picks each choice in turn, and closes it: it stays open between picks. */
const chooseEach = (name: string, ...labels: string[]) => {
  fireEvent.click(select(name));
  const list = screen.getByRole('listbox', { name: `${name} choices` });
  for (const label of labels) fireEvent.click(within(list).getByRole('option', { name: label }));
  fireEvent.keyDown(select(name), { key: 'Escape' });
};
/** Presses Save, focusing it first as a real click would: fireEvent moves no focus. */
const save = () => {
  const button = screen.getByRole('button', { name: 'Save Ingredient' });
  button.focus();
  fireEvent.click(button);
};
/** Presses Save & Add Another, the secondary save, focusing it first as `save` does. */
const saveAnother = () => {
  const button = screen.getByRole('button', { name: 'Save & Add Another' });
  button.focus();
  fireEvent.click(button);
};
/** Types an entry into a list's box and presses its Add button. */
const addEntry = (entry: string, value: string) => {
  type(entry, value);
  fireEvent.click(screen.getByRole('button', { name: `Add ${entry}` }));
};
const removeButton = (value: string) => screen.getByRole('button', { name: `Remove ${value}` });

/** Answers `CreateWorkspaceIngredient` with a saved row, recording the variables it was sent. */
function acceptCreate() {
  const calls: CreateWorkspaceIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    CreateWorkspaceIngredientMutation,
    CreateWorkspaceIngredientMutationVariables
  >('CreateWorkspaceIngredient', (variables) => {
    calls.push(variables);
    return { createWorkspaceIngredient: { id: 'saved-1', name: variables.input.name } };
  });
  return calls;
}

/** The control is flagged invalid and reads `message` as part of its description. */
function expectErrorOn(control: HTMLElement, message: string) {
  expect(control).toBeInvalid();
  expect(control).toHaveAccessibleDescription(expect.stringContaining(message));
}

/** The six list fields; the four that keep the order entered move their entries (MB.170). */
const LISTS = [
  {
    legend: 'Folk Names',
    entry: 'Folk Name',
    field: 'folkNames',
    hint: 'Other names it goes by',
    ordered: false,
  },
  {
    legend: 'Planets',
    entry: 'Planet',
    field: 'planets',
    hint: 'The heavenly bodies it answers to',
    ordered: true,
  },
  {
    legend: 'Zodiac Signs',
    entry: 'Zodiac Sign',
    field: 'zodiacSigns',
    hint: 'The signs it answers to',
    ordered: true,
  },
  {
    legend: 'Colours',
    entry: 'Colour',
    field: 'colors',
    hint: 'not the colour it is',
    ordered: true,
  },
  {
    legend: 'Deities',
    entry: 'Deity',
    field: 'deities',
    hint: 'The gods and spirits',
    ordered: true,
  },
  {
    legend: 'Substitute Ingredients',
    entry: 'Substitute Ingredient',
    field: 'substitutes',
    hint: 'Other ingredients to use in its place',
    ordered: false,
  },
] as const;

/**
 * One list field on its own, given its entries as an edit would be: the way
 * to hold a repeat the schema refuses at save, since the box refuses one at
 * Add and the lookup never offers one (MB.174).
 */
function renderGivenList(
  { legend, entry, field, ordered }: (typeof LISTS)[number],
  values: Partial<IngredientFormValues>,
) {
  const onSubmit = vi.fn();
  const Harness = () => {
    const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
      defaultValues: { ...EMPTY_VALUES, name: 'Testwort', ...values },
      resolver: ingredientResolver,
    });
    return (
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <ListField name={field} legend={legend} entry={entry} ordered={ordered} />
          <button type="submit">Save Ingredient</button>
        </form>
      </FormProvider>
    );
  };
  render(<Harness />);
  return onSubmit;
}

/** The list of LISTS with this field. */
const listOf = (field: (typeof LISTS)[number]['field']) =>
  LISTS.find((list) => list.field === field)!;

describe('IngredientForm', () => {
  // The owner's rule for every form (M5.6): a save is offered only when there
  // is something to save.
  it('keeps both saves off until something is entered, and off again once it is cleared', () => {
    renderForm();
    const saves = () => [
      screen.getByRole('button', { name: 'Save Ingredient' }),
      screen.getByRole('button', { name: 'Save & Add Another' }),
    ];

    for (const button of saves()) expect(button).toBeDisabled();
    type('Name', 'T');
    for (const button of saves()) expect(button).toBeEnabled();
    type('Name', '');
    for (const button of saves()) expect(button).toBeDisabled();
  });

  describe('saving a stub', () => {
    it('saves with only a name, leaving the classification to the local default of "none"', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      save();

      await waitFor(() =>
        expect(onSaved).toHaveBeenCalledWith({ id: 'saved-1', name: 'Testwort' }, 'open'),
      );
      expect(calls).toHaveLength(1);
      expect(calls[0].workspaceId).toBe(WORKSPACE_ID);
      // Sent as typed — the kind unanswered — and read by the schema the
      // service parses with as `none`, so the one-field stub is a whole entry.
      expect(calls[0].input).toMatchObject({ name: 'Testwort', nomenclature: null });
      expect(LocalIngredientInput.parse(calls[0].input)).toMatchObject({
        name: 'Testwort',
        nomenclature: 'none',
        canonicalName: null,
        folkNames: null,
      });
    });

    it('sends every field the form holds, as typed', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      choose('Classification', 'Botanical');
      type('Formal Name', 'Fixtura testalis');
      type('Form', 'dried leaf');
      type('Description', 'A fixture herb.');
      chooseEach('Element', 'Water', 'Air');
      addEntry('Planet', 'Mercury');
      addEntry('Planet', 'Venus');
      addEntry('Zodiac Sign', 'Gemini');
      addEntry('Colour', 'Silver-green');
      type('Safety Notes', 'None known.');
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input).toEqual({
        name: 'Testwort',
        nomenclature: 'botanical',
        canonicalName: 'Fixtura testalis',
        form: 'dried leaf',
        description: 'A fixture herb.',
        // In the order chosen, not the vocabulary's.
        elements: ['water', 'air'],
        planets: ['Mercury', 'Venus'],
        zodiacSigns: ['Gemini'],
        colors: ['Silver-green'],
        safetyNotes: 'None known.',
        // Typed, so it records no pick (MB.169).
        formId: null,
        deities: [],
        substitutes: [],
        folkNames: [],
        // None picked is sent as none, which an update needs to clear them.
        categoryIds: [],
        references: [],
      });
    });

    // The owner's call during MB.131: Save Ingredient opens what it made,
    // and Save & Add Another leaves the form ready for the next ingredient.
    it('asks the page to open what Save Ingredient made, leaving the form as it is', async () => {
      acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      addEntry('Planet', 'Mercury');
      save();

      await waitFor(() =>
        expect(onSaved).toHaveBeenCalledWith({ id: 'saved-1', name: 'Testwort' }, 'open'),
      );
      // The page it is on navigates; the form is about to go, so it keeps its values.
      expect(textbox('Name')).toHaveValue('Testwort');
      expect(removeButton('Mercury')).toBeInTheDocument();
    });

    it('makes Save Ingredient the default, which Enter in a field presses', async () => {
      acceptCreate();
      const onSaved = renderForm();

      const submits = screen
        .getAllByRole('button')
        .filter((button) => button.getAttribute('type') === 'submit');
      expect(submits.map((button) => button.textContent)).toEqual([
        'Save Ingredient',
        'Save & Add Another',
      ]);
      type('Name', 'Testwort');
      // A submit with no button pressed, as implicit submission from a field is in jsdom.
      fireEvent.submit(textbox('Name').closest('form') as HTMLFormElement);

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.anything(), 'open'));
    });

    it('clears every field and list once saved by Save & Add Another, and puts the focus in Name', async () => {
      acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      choose('Classification', 'Botanical');
      type('Formal Name', 'Fixtura testalis');
      type('Form', 'dried leaf');
      type('Description', 'A fixture herb.');
      chooseEach('Element', 'Air');
      addEntry('Planet', 'Mercury');
      addEntry('Folk Name', 'Hedge Fixture');
      type('Safety Notes', 'None known.');
      saveAnother();

      await waitFor(() =>
        expect(onSaved).toHaveBeenCalledWith({ id: 'saved-1', name: 'Testwort' }, 'another'),
      );
      await waitFor(() => expect(textbox('Name')).toHaveValue(''));
      expect(textbox('Name')).toHaveFocus();
      expect(select('Classification')).toHaveTextContent('Choose a classification');
      expect(textbox('Formal Name')).toHaveValue('');
      expect(textbox('Formal Name')).toBeEnabled();
      expect(box('Form')).toHaveValue('');
      expect(textbox('Description')).toHaveValue('');
      expect(select('Element')).toHaveTextContent('Choose elements');
      expect(screen.queryByRole('button', { name: 'Remove Air' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove Mercury' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Remove Hedge Fixture' }),
      ).not.toBeInTheDocument();
      expect(textbox('Safety Notes')).toHaveValue('');
      // Cleared, not refused: nothing is marked invalid.
      expect(textbox('Name')).not.toBeInvalid();
    });

    it('says what it saved above the fields, until the next save', async () => {
      acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      saveAnother();

      // A status, polite, inside the form where its error alert would be.
      const saved = await screen.findByText('Saved Testwort.');
      expect(saved).toHaveRole('status');
      expect(saved.closest('form')).not.toBeNull();
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));

      // A save refused by the resolver is a new answer, and the old one goes:
      // something entered, since a cleared form offers no save, but no name.
      type('Description', 'An entry with no name.');
      save();
      await waitFor(() => expect(screen.queryByText('Saved Testwort.')).not.toBeInTheDocument());
    });

    it('keeps what was typed when the save is refused', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', { code: 'FORBIDDEN', message: 'Not yours.' });
      renderForm();

      type('Name', 'Testwort');
      addEntry('Planet', 'Mercury');
      save();

      await screen.findByRole('alert');
      expect(textbox('Name')).toHaveValue('Testwort');
      expect(removeButton('Mercury')).toBeInTheDocument();
    });
  });

  describe('a resolver error', () => {
    // The form's pick is not a field of its own: the box that made it is
    // Form's, so the schema's issue with it lands there (MB.169).
    it.each([
      { id: 'not-a-uuid', form: 'Wax', message: 'No such form to pick' },
      { id: '6e1f2a3b-4c5d-4e7f-8a9b-0c1d2e3f4a5b', form: '', message: 'Name the form you picked' },
    ])(
      'puts an issue with the form’s pick, or with its text, on Form ($message)',
      async ({ id, form, message }) => {
        const formLink = { id, name: 'Wax', group: null, description: null };

        const { errors } = await ingredientResolver(
          { ...EMPTY_VALUES, name: 'Testwort', form, formLink },
          undefined,
          { fields: {}, shouldUseNativeValidation: false },
        );

        expect(errors).toEqual({ form: expect.objectContaining({ message }) });
      },
    );

    it('appears beside its field, focused and announced, before any request is sent', async () => {
      const calls = acceptCreate();
      renderForm();

      type('Description', 'An entry with no name.');
      save();

      const name = textbox('Name');
      await waitFor(() => expectErrorOn(name, 'Give the ingredient a name'));
      expect(name).toHaveFocus();
      expect(calls).toHaveLength(0);
    });

    it('clears once the field is corrected', async () => {
      acceptCreate();
      renderForm();

      type('Description', 'An entry with no name.');
      save();
      await waitFor(() => expect(textbox('Name')).toBeInvalid());
      type('Name', 'Testwort');

      await waitFor(() => expect(textbox('Name')).not.toBeInvalid());
      expect(screen.queryByText('Give the ingredient a name')).not.toBeInTheDocument();
    });

    // Given the repeat, since the box refuses one at Add (MB.174); a server
    // error's test shows an entry's error taking the focus.
    it('lands on the list entry it names', async () => {
      const onSubmit = renderGivenList(listOf('folkNames'), {
        folkNames: [{ value: 'Hedge Fixture' }, { value: 'hedge fixture' }],
      });

      save();

      const folkName = box('Folk Name');
      await waitFor(() => expectErrorOn(folkName, 'This folk name is already listed'));
      // The entry itself says why, and its twin says nothing.
      expect(removeButton('hedge fixture')).toHaveAccessibleDescription(
        expect.stringContaining('This folk name is already listed'),
      );
      expect(removeButton('Hedge Fixture')).not.toHaveAccessibleDescription(
        expect.stringContaining('This folk name is already listed'),
      );
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('clears from a list once the entry it names is removed', async () => {
      renderGivenList(listOf('folkNames'), {
        folkNames: [{ value: 'Hedge Fixture' }, { value: 'hedge fixture' }],
      });

      save();
      await waitFor(() => expect(box('Folk Name')).toBeInvalid());
      fireEvent.click(removeButton('hedge fixture'));

      await waitFor(() => expect(box('Folk Name')).not.toBeInvalid());
      expect(screen.queryByText(/This folk name is already listed/)).not.toBeInTheDocument();
    });
  });

  describe('a server error', () => {
    it('appears beside the field its path names, focused and announced', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [
          { path: ['canonicalName'], message: 'This coven already has Fixtura testalis' },
        ],
      });
      renderForm();

      type('Name', 'Testwort');
      choose('Classification', 'Botanical');
      type('Formal Name', 'Fixtura testalis');
      save();

      const formal = textbox('Formal Name');
      await waitFor(() => expectErrorOn(formal, 'This coven already has Fixtura testalis'));
      expect(formal).toHaveFocus();
    });

    // A pick the server could not find, the form since retired: its issue is
    // pathed to the pick, which the form shows as the Form field.
    it('lands an issue pathed to the form’s pick on the Form field', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['formId'], message: 'No such form to pick' }],
      });
      renderForm();

      type('Name', 'Testwort');
      save();

      await waitFor(() => expectErrorOn(box('Form'), 'No such form to pick'));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders through the same element as a resolver error on that field', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'], message: 'This coven already has a Testwort' }],
      });
      renderForm();

      type('Description', 'An entry with no name.');
      save();
      const fromResolver = await screen.findByText('Give the ingredient a name');
      type('Name', 'Testwort');
      save();
      const fromServer = await screen.findByText('This coven already has a Testwort');

      // One element, two sources: the same id the control describes itself by,
      // the same markup.
      expect(fromServer.id).toBe(fromResolver.id);
      expect(fromServer.tagName).toBe(fromResolver.tagName);
      expect(fromServer.className).toBe(fromResolver.className);
      expect(textbox('Name').getAttribute('aria-describedby')).toContain(fromServer.id);
    });

    it('lands on the list entry its path names', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [
          { path: ['folkNames', 2], message: 'Another entry here claims Hedge Fixture' },
        ],
      });
      renderForm();

      type('Name', 'Testwort');
      addEntry('Folk Name', 'Fixture Bane');
      addEntry('Folk Name', 'Fixture Wort');
      addEntry('Folk Name', 'Hedge Fixture');
      save();

      await waitFor(() =>
        expectErrorOn(box('Folk Name'), 'Another entry here claims Hedge Fixture'),
      );
      expect(box('Folk Name')).toHaveFocus();
      expect(removeButton('Hedge Fixture')).toHaveAccessibleDescription(
        expect.stringContaining('Another entry here claims Hedge Fixture'),
      );
      expect(removeButton('Fixture Bane')).not.toHaveAccessibleDescription(
        expect.stringContaining('Another entry here claims Hedge Fixture'),
      );
    });

    // An element list's issue is pathed to the entry, but the control is one
    // box: the whole of it carries the error, rather than the form above it.
    it('lands an issue pathed to one element on the Element control', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['elements', 1], message: 'Air is already chosen' }],
      });
      renderForm();

      type('Name', 'Testwort');
      chooseEach('Element', 'Earth', 'Air');
      save();

      const element = select('Element');
      await waitFor(() => expectErrorOn(element, 'Air is already chosen'));
      expect(element).toHaveFocus();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('clears once the field is edited', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'], message: 'This coven already has a Testwort' }],
      });
      renderForm();

      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(textbox('Name')).toBeInvalid());
      type('Name', 'Testwort the Second');

      await waitFor(() => expect(textbox('Name')).not.toBeInvalid());
      expect(screen.queryByText('This coven already has a Testwort')).not.toBeInTheDocument();
    });
  });

  describe('an error belonging to no one field', () => {
    it('renders above the fields as an alert when its path is empty', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: [], message: 'The coven cannot take new ingredients right now' }],
      });
      renderForm();

      type('Name', 'Testwort');
      save();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('The coven cannot take new ingredients right now');
      // Above the first field, and beside none of them.
      expect(
        alert.compareDocumentPosition(textbox('Name')) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(textbox('Name')).not.toBeInvalid();
    });

    it('renders above the fields when its path names no field the form has', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['slug'], message: 'That slug is already taken' }],
      });
      renderForm();

      type('Name', 'Testwort');
      save();

      expect(await screen.findByRole('alert')).toHaveTextContent('That slug is already taken');
    });

    it("shows a refusal's own message", async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'FORBIDDEN',
        message: 'Viewers cannot add ingredients',
      });
      renderForm();

      type('Name', 'Testwort');
      save();

      expect(await screen.findByRole('alert')).toHaveTextContent('Viewers cannot add ingredients');
    });

    it('says something went wrong when the request never reached an answer', async () => {
      server.use(graphqlLink.mutation('CreateWorkspaceIngredient', () => HttpResponse.error()));
      renderForm();

      type('Name', 'Testwort');
      save();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        "That didn't work. Please try again.",
      );
    });

    it('clears on the next submit', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: [], message: 'The coven cannot take new ingredients right now' }],
      });
      renderForm();

      type('Name', 'Testwort');
      save();
      await screen.findByRole('alert');
      acceptCreate();
      save();

      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    });
  });

  describe('the categories', () => {
    // Invented groups (M1.25), given out of order: the picker sorts them, and
    // knows none of them by name, as it knows no group an admin adds.
    const WARDS = { id: 'a3e1c9b2-0d4f-4a8e-9c71-5b2f6e8d0a11', name: 'Wards & Fixtures' };
    const CRAFT = { id: 'b7f2d0c3-1e5a-4b9f-8d82-6c3a7f9e1b22', name: 'Craft of Tests' };
    const colours = { colorDark: '#8fb8de', colorLight: '#2f5d86' };
    const CATEGORIES: CategoryNode[] = [
      {
        id: 'c1d3e5f7-2a4b-4c6d-8e9f-0a1b2c3d4e51',
        name: 'Testward',
        description: 'Keeps a fixture from harm.',
        group: { ...WARDS, ...colours },
      },
      {
        id: 'c1d3e5f7-2a4b-4c6d-8e9f-0a1b2c3d4e52',
        name: 'Fixture Shield',
        description: 'Turns a failing test aside.',
        group: { ...WARDS, ...colours },
      },
      {
        id: 'c1d3e5f7-2a4b-4c6d-8e9f-0a1b2c3d4e53',
        name: 'Trialcraft',
        description: 'Works a change by trial.',
        group: { ...CRAFT, ...colours },
      },
    ];
    const [testward, , trialcraft] = CATEGORIES;
    const picker = () => screen.getByRole('group', { name: 'Categories' });
    const open = () =>
      fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
    /** Opens the list and picks the category, once the categories have been read. */
    const pick = async (name: string) => {
      open();
      fireEvent.click(await screen.findByRole('option', { name: new RegExp(`^${name}`) }));
    };

    it('offers every category under its group, the groups alphabetical by name', async () => {
      renderForm({ categories: CATEGORIES });

      open();
      const craft = await screen.findByRole('group', { name: CRAFT.name });
      const wards = screen.getByRole('group', { name: WARDS.name });
      expect(craft.compareDocumentPosition(wards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(
        within(wards)
          .getAllByRole('option')
          .map((row) => row.textContent),
      ).toEqual([expect.stringMatching(/^Fixture Shield/), expect.stringMatching(/^Testward/)]);
    });

    it('sends the picked categories as categoryIds, by id, in the order picked', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm({ categories: CATEGORIES });

      type('Name', 'Testwort');
      await pick('Trialcraft');
      await pick('Testward');
      expect(removeButton('Trialcraft')).toBeInTheDocument();
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input.categoryIds).toEqual([trialcraft.id, testward.id]);
    });

    it('is something to save on its own', async () => {
      renderForm({ categories: CATEGORIES });

      await pick('Trialcraft');

      expect(screen.getByRole('button', { name: 'Save Ingredient' })).toBeEnabled();
    });

    it('lands an issue on one pick on the picker’s error element, naming the pick', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['categoryIds', 1], message: 'No such category' }],
      });
      renderForm({ categories: CATEGORIES });

      type('Name', 'Testwort');
      await pick('Testward');
      await pick('Fixture Shield');
      save();

      const message = 'Fixture Shield: No such category';
      const error = await screen.findByText(message);
      await waitFor(() => expectErrorOn(box('Category'), message));
      expect(box('Category')).toHaveFocus();
      expect(removeButton('Fixture Shield')).toHaveAccessibleDescription(
        expect.stringContaining(message),
      );
      expect(removeButton('Testward')).not.toHaveAccessibleDescription(
        expect.stringContaining(message),
      );
      // The form's one error element, as every other field's.
      expect(error).toHaveClass('field__error');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('clears an issue on a pick once the pick it names is taken out', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['categoryIds', 0], message: 'No such category' }],
      });
      renderForm({ categories: CATEGORIES });

      type('Name', 'Testwort');
      await pick('Fixture Shield');
      save();
      await screen.findByText('Fixture Shield: No such category');
      fireEvent.click(removeButton('Fixture Shield'));

      await waitFor(() =>
        expect(screen.queryByText('Fixture Shield: No such category')).not.toBeInTheDocument(),
      );
      expect(box('Category')).not.toBeInvalid();
    });

    // An index past the picks names none of them: the form has no field for
    // it, so it is said above the fields rather than lost.
    it('says an issue naming no pick above the fields', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['categoryIds', 4], message: 'No such category' }],
      });
      renderForm({ categories: CATEGORIES });

      type('Name', 'Testwort');
      save();

      expect(await screen.findByRole('alert')).toHaveTextContent('No such category');
    });

    it('clears the picks once saved by Save & Add Another', async () => {
      acceptCreate();
      const onSaved = renderForm({ categories: CATEGORIES });

      type('Name', 'Testwort');
      await pick('Trialcraft');
      saveAnother();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Remove Trialcraft' })).not.toBeInTheDocument(),
      );
    });

    it('says so when the categories cannot be read, and the rest of the form still saves', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm({ categories: 'refused' });

      expect(
        await within(picker()).findByText('The categories could not be loaded.'),
      ).toBeVisible();
      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input.categoryIds).toEqual([]);
    });
  });

  describe('the kind↔name coupling', () => {
    it('asks for the formal name a named kind needs', async () => {
      const calls = acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      choose('Classification', 'Botanical');
      save();

      await waitFor(() =>
        expectErrorOn(textbox('Formal Name'), 'A botanical entry needs its formal name'),
      );
      expect(calls).toHaveLength(0);
    });

    // The schema refuses a formal name on none; the form never lets one be
    // sent, so that refusal is the service's alone.
    it('shuts the formal name under None, emptying it and saying why', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      type('Formal Name', 'Fixtura testalis');
      choose('Classification', 'None');

      const formal = textbox('Formal Name');
      expect(formal).toBeDisabled();
      expect(formal).toHaveValue('');
      expect(formal).toHaveAccessibleDescription(
        expect.stringContaining('A "none" entry records no formal name.'),
      );
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input).toMatchObject({ nomenclature: 'none', canonicalName: '' });
    });

    // An unknown entry takes either (MB.161), so a name typed before the kind
    // is settled is kept, and nothing is asked of the field.
    it('keeps the formal name open and optional under Unknown, saving what was typed', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      type('Formal Name', 'Fixtura testalis');
      choose('Classification', 'Unknown');

      const formal = textbox('Formal Name');
      expect(formal).toBeEnabled();
      expect(formal).toHaveValue('Fixtura testalis');
      expect(formal).not.toBeRequired();
      expect(formal).not.toHaveAccessibleDescription(
        expect.stringContaining('records no formal name'),
      );
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input).toMatchObject({
        nomenclature: 'unknown',
        canonicalName: 'Fixtura testalis',
      });
    });

    it('opens the formal name again for a named kind', () => {
      renderForm();

      choose('Classification', 'None');
      expect(textbox('Formal Name')).toBeDisabled();
      choose('Classification', 'Mineral');

      expect(textbox('Formal Name')).toBeEnabled();
      expect(textbox('Formal Name')).not.toHaveAccessibleDescription(
        expect.stringContaining('records no formal name'),
      );
    });

    it('saves a formal name with no classification, which the schema reads as unknown', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      type('Formal Name', 'Fixtura testalis');
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(select('Classification')).not.toBeInvalid();
      expect(calls[0].input).toMatchObject({
        nomenclature: null,
        canonicalName: 'Fixtura testalis',
      });
      expect(LocalIngredientInput.parse(calls[0].input)).toMatchObject({
        nomenclature: 'unknown',
        canonicalName: 'Fixtura testalis',
      });
    });

    // Inline: fixing either side clears the error on the other, with no second submit.
    it('clears the formal-name error when the kind changes to None', async () => {
      acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      choose('Classification', 'Botanical');
      save();
      await waitFor(() => expect(textbox('Formal Name')).toBeInvalid());
      choose('Classification', 'None');

      await waitFor(() => expect(textbox('Formal Name')).not.toBeInvalid());
      expect(textbox('Formal Name')).toBeDisabled();
    });

    it('clears the formal-name error when the kind changes to Unknown, leaving it open', async () => {
      acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      choose('Classification', 'Botanical');
      save();
      await waitFor(() => expect(textbox('Formal Name')).toBeInvalid());
      choose('Classification', 'Unknown');

      await waitFor(() => expect(textbox('Formal Name')).not.toBeInvalid());
      expect(textbox('Formal Name')).toBeEnabled();
    });

    it('offers every classification behind a placeholder that is not one', () => {
      renderForm();

      expect(select('Classification')).toHaveTextContent('Choose a classification');
      fireEvent.click(select('Classification'));

      // The placeholder is not in the list, so only the kinds are offered.
      const list = screen.getByRole('listbox', { name: 'Classification choices' });
      expect(
        within(list)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Botanical', 'Fungal', 'Zoological', 'Mineral', 'Chemical', 'Unknown', 'None']);
    });
  });

  describe('the closed and open fields', () => {
    it('marks only the name required at first', () => {
      renderForm();

      expect(textbox('Name')).toBeRequired();
      expect(textbox('Formal Name')).not.toBeRequired();
      expect(select('Classification')).not.toBeRequired();
    });

    it('marks the formal name required while a named classification is chosen', () => {
      renderForm();

      choose('Classification', 'Mineral');
      expect(textbox('Formal Name')).toBeRequired();

      choose('Classification', 'Unknown');
      expect(textbox('Formal Name')).not.toBeRequired();

      choose('Classification', 'None');
      expect(textbox('Formal Name')).not.toBeRequired();
    });

    // A formal name with no kind saves as unknown (MB.161), so it asks for none.
    it('marks no classification required for a typed formal name', () => {
      renderForm();

      type('Formal Name', 'Fixtura testalis');
      expect(select('Classification')).not.toBeRequired();
    });

    it("keeps a field's hint shut while the field has focus, still reading it with the field", () => {
      renderForm();

      act(() => select('Classification').focus());
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(select('Classification')).toHaveAccessibleDescription(
        expect.stringContaining('Botanical for a plant, mineral for a stone'),
      );

      act(() => box('Folk Name').focus());
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(box('Folk Name')).toHaveAccessibleDescription(
        expect.stringContaining('Other names it goes by'),
      );
    });

    it("tucks a field's hint behind an info tip by its label, still read with the field", () => {
      renderForm();

      expect(screen.getByRole('button', { name: 'About Classification' })).toBeInTheDocument();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(select('Classification')).toHaveAccessibleDescription(
        expect.stringContaining('Botanical for a plant, mineral for a stone'),
      );
    });

    // MB.159: an ingredient holds several elements, so the closed set is a
    // list on the select-only box, and an empty list is the answer "none".
    it('offers the five elements and nothing else, none chosen by default', () => {
      renderForm();

      expect(select('Element')).toHaveTextContent('Choose elements');
      fireEvent.click(select('Element'));
      const list = screen.getByRole('listbox', { name: 'Element choices' });
      expect(
        within(list)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Earth', 'Air', 'Fire', 'Water', 'Spirit']);
      // Nothing typed and nothing added: no box to type in, and no Add.
      expect(screen.queryByRole('button', { name: 'Add Element' })).not.toBeInTheDocument();
    });

    it('chooses several elements as chips inside the control, offering only those left', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      fireEvent.click(select('Element'));
      fireEvent.click(screen.getByRole('option', { name: 'Fire' }));
      fireEvent.click(screen.getByRole('option', { name: 'Spirit' }));
      expect(
        within(screen.getByRole('listbox', { name: 'Element choices' }))
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Earth', 'Air', 'Water']);
      fireEvent.keyDown(select('Element'), { key: 'Escape' });
      const control = select('Element').closest('.combobox__control') as HTMLElement;
      expect(control).toContainElement(removeButton('Fire'));
      expect(control).toContainElement(removeButton('Spirit'));
      // Backspace in the box takes the last, and the x takes its own.
      fireEvent.keyDown(select('Element'), { key: 'Backspace' });
      expect(screen.queryByRole('button', { name: 'Remove Spirit' })).not.toBeInTheDocument();
      chooseEach('Element', 'Earth', 'Water');
      fireEvent.click(removeButton('Earth'));
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input.elements).toEqual(['fire', 'water']);
    });

    it('sends no element as an empty list', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      chooseEach('Element', 'Air');
      fireEvent.click(screen.getByRole('button', { name: 'Clear Element' }));
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input.elements).toEqual([]);
    });

    // The owner's call during MB.131: a closed set wears the suggesting
    // fields' control and list, with nothing to type.
    it("draws a closed set as the combobox's control, select-only, with its chevron", () => {
      renderForm();

      const classification = select('Classification');
      expect(classification.tagName).not.toBe('SELECT');
      expect(classification).not.toHaveAttribute('aria-autocomplete');
      expect(classification).toHaveClass('combobox__control');
      expect(classification).toHaveAttribute('aria-expanded', 'false');
      expect(classification).toHaveAttribute('tabindex', '0');
      expect(classification.querySelector('svg')).toBeInTheDocument();
    });

    it('chooses by the keyboard: the arrows open and move, Enter chooses, Escape closes', () => {
      renderForm();
      const classification = select('Classification');
      act(() => classification.focus());

      fireEvent.keyDown(classification, { key: 'ArrowDown' });
      expect(classification).toHaveAttribute('aria-expanded', 'true');
      fireEvent.keyDown(classification, { key: 'ArrowDown' });
      expect(classification).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Fungal' }).id,
      );
      fireEvent.keyDown(classification, { key: 'Enter' });
      expect(classification).toHaveAttribute('aria-expanded', 'false');
      expect(classification).toHaveTextContent('Fungal');

      fireEvent.keyDown(classification, { key: 'ArrowDown' });
      fireEvent.keyDown(classification, { key: 'ArrowDown' });
      fireEvent.keyDown(classification, { key: 'Escape' });
      expect(classification).toHaveAttribute('aria-expanded', 'false');
      expect(classification).toHaveTextContent('Fungal');
    });

    it('takes form as free text rather than a fixed choice', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      const form = box('Form');
      expect(form.tagName).toBe('INPUT');
      type('Name', 'Testwort');
      type('Form', 'moon-dried shavings');
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input.form).toBe('moon-dried shavings');
    });
  });

  // Planets, zodiac signs and colours are lists since MB.136, as DESIGN.md §5 gives them.
  describe.each(LISTS)('the $legend list', ({ legend, entry, field, hint, ordered }) => {
    const group = () => screen.getByRole('group', { name: legend });
    // A typed substitute or deity is sent as a name (DESIGN.md §5,
    // `ingredient_substitutes` and `ingredient_deities`).
    const sent = (values: string[]) =>
      field === 'substitutes' || field === 'deities' ? values.map((name) => ({ name })) : values;
    const entries = () =>
      within(group())
        .queryAllByRole('button', { name: /^Remove / })
        .map((button) => button.getAttribute('aria-label'));

    it('tucks its hint behind an info tip by its legend, still read with the box', () => {
      renderForm();

      expect(screen.getByRole('button', { name: `About ${legend}` })).toBeInTheDocument();
      expect(box(entry)).toHaveAccessibleDescription(expect.stringContaining(hint));
    });

    it('starts with one empty box and no entries', () => {
      renderForm();

      expect(within(group()).getAllByRole('combobox')).toHaveLength(1);
      expect(box(entry)).toHaveValue('');
      expect(within(group()).queryByRole('list')).not.toBeInTheDocument();
    });

    it('adds what is typed as an entry above the box, clearing and keeping the box focused', () => {
      renderForm();

      addEntry(entry, '  First Fixture ');

      expect(within(group()).getByRole('list')).toBeInTheDocument();
      expect(entries()).toEqual(['Remove First Fixture']);
      expect(box(entry)).toHaveValue('');
      expect(box(entry)).toHaveFocus();
    });

    it('adds on Enter without saving the form', () => {
      const calls = acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      type(entry, 'First Fixture');
      fireEvent.keyDown(box(entry), { key: 'Enter' });

      expect(entries()).toEqual(['Remove First Fixture']);
      expect(calls).toHaveLength(0);
    });

    it('announces each entry added and removed, politely', () => {
      renderForm();

      addEntry(entry, 'First Fixture');
      const status = within(group()).getByRole('status', { name: `${legend} changes` });
      expect(status).toHaveTextContent('Added First Fixture');

      fireEvent.click(removeButton('First Fixture'));
      expect(status).toHaveTextContent('Removed First Fixture');
    });

    it('adds nothing when the box is blank', () => {
      renderForm();

      addEntry(entry, '   ');

      expect(entries()).toEqual([]);
    });

    it('removes an entry from its x, returning focus to the box', () => {
      renderForm();

      addEntry(entry, 'First Fixture');
      addEntry(entry, 'Second Fixture');
      fireEvent.click(removeButton('First Fixture'));

      expect(entries()).toEqual(['Remove Second Fixture']);
      expect(box(entry)).toHaveFocus();
    });

    it('removes the last entry on Backspace in the empty box, announcing it', () => {
      renderForm();

      addEntry(entry, 'First Fixture');
      addEntry(entry, 'Second Fixture');
      type(entry, 'Thi');
      fireEvent.keyDown(box(entry), { key: 'Backspace' });
      expect(entries()).toEqual(['Remove First Fixture', 'Remove Second Fixture']);

      type(entry, '');
      fireEvent.keyDown(box(entry), { key: 'Backspace' });

      expect(entries()).toEqual(['Remove First Fixture']);
      expect(within(group()).getByRole('status', { name: `${legend} changes` })).toHaveTextContent(
        'Removed Second Fixture',
      );
      expect(box(entry)).toHaveFocus();
    });

    it('clears every entry from Clear, announcing it and keeping the box focused', () => {
      renderForm();

      expect(screen.queryByRole('button', { name: `Clear ${legend}` })).not.toBeInTheDocument();
      addEntry(entry, 'First Fixture');
      addEntry(entry, 'Second Fixture');
      fireEvent.click(screen.getByRole('button', { name: `Clear ${legend}` }));

      expect(entries()).toEqual([]);
      expect(within(group()).getByRole('status', { name: `${legend} changes` })).toHaveTextContent(
        `Cleared ${legend}`,
      );
      expect(box(entry)).toHaveFocus();
    });

    // M5.10a: one entry box, the combobox, on every list. Every list but the
    // colours has a source (MB.131), the owner's call.
    it(`is the combobox, ${field === 'colors' ? 'without' : 'with'} a list to open`, () => {
      renderForm();

      expect(box(entry)).toHaveAttribute('aria-autocomplete', 'list');
      expect(box(entry).closest('.combobox__control')).toContainElement(box(entry));
      const chevron = screen.queryByRole('button', { name: `Show ${entry} suggestions` });
      if (field === 'colors') expect(chevron).not.toBeInTheDocument();
      else expect(chevron).toBeInTheDocument();
    });

    it('holds its entries inside the box, ahead of the text', () => {
      renderForm();

      addEntry(entry, 'First Fixture');

      const inside = box(entry).closest('.combobox__control') as HTMLElement;
      expect(inside).toContainElement(removeButton('First Fixture'));
      expect(
        removeButton('First Fixture').compareDocumentPosition(box(entry)) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    describe('a long entry', () => {
      const long =
        'Fixturawortiamtestalisfixturawortiamtestalisfixturawortiamtestalisfixturawortiam';
      const tooltip = () => within(group()).queryByRole('tooltip');

      // jsdom lays nothing out, so an entry's text is cut off when it is
      // longer than 30 characters: wider than the 240px left to it.
      beforeEach(() => {
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
          this: HTMLElement,
        ) {
          return (this.textContent ?? '').length * 8;
        });
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(240);
      });
      afterEach(() => vi.restoreAllMocks());

      // What a pointer rests on: the entry's words, not the tooltip that
      // repeats them, which stays in the page while closed.
      const entryText = (value: string) =>
        within(within(group()).getByRole('list')).getByText(value, {
          ignore: '[role="tooltip"]',
        });

      it('shows its whole text in a tooltip on hover, until the pointer leaves', async () => {
        renderForm();

        addEntry(entry, long);
        const text = entryText(long);
        expect(tooltip()).not.toBeInTheDocument();
        fireEvent.mouseEnter(text);

        expect(tooltip()).toHaveTextContent(long);
        fireEvent.mouseLeave(text);
        await waitFor(() => expect(tooltip()).not.toBeInTheDocument());
      });

      it('shows it while its x has focus, and closes on Escape', () => {
        renderForm();

        addEntry(entry, long);
        act(() => removeButton(long).focus());

        expect(tooltip()).toHaveTextContent(long);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(tooltip()).not.toBeInTheDocument();
        expect(removeButton(long)).toHaveFocus();
      });

      it('keeps its x named by the whole text', () => {
        renderForm();

        addEntry(entry, long);

        expect(removeButton(long)).toBeInTheDocument();
      });

      it('shows no tooltip on an entry that fits', () => {
        renderForm();

        addEntry(entry, 'Testwort');
        fireEvent.mouseEnter(entryText('Testwort'));
        act(() => removeButton('Testwort').focus());

        expect(tooltip()).not.toBeInTheDocument();
      });
    });

    it('sends the entries in order, less any removed', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      for (const value of ['First Fixture', 'Second Fixture', 'Third Fixture']) {
        addEntry(entry, value);
      }
      fireEvent.click(removeButton('Second Fixture'));
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input[field]).toEqual(sent(['First Fixture', 'Third Fixture']));
    });

    // MB.170: the four lists that keep the order entered move their entries;
    // folk names and substitutes read alphabetically, so they have nothing to
    // move.
    it(`${ordered ? 'offers a' : 'offers no'} handle to move an entry by`, () => {
      renderForm();

      addEntry(entry, 'First Fixture');
      addEntry(entry, 'Second Fixture');

      // The precondition: both entries are drawn, each with its x.
      expect(entries()).toEqual(['Remove First Fixture', 'Remove Second Fixture']);
      const handles = within(group()).queryAllByRole('button', { name: /^Move / });
      expect(handles.map((handle) => handle.getAttribute('aria-label'))).toEqual(
        ordered ? ['Move First Fixture', 'Move Second Fixture'] : [],
      );
    });

    it('refuses to save with text left in the box, until it is added', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      addEntry(entry, 'First Fixture');
      type(entry, 'Second Fixture');
      save();

      const target = box(entry);
      await waitFor(() =>
        expectErrorOn(target, 'Press Add to keep "Second Fixture", or clear the box'),
      );
      expect(target).toHaveFocus();
      expect(calls).toHaveLength(0);

      fireEvent.click(screen.getByRole('button', { name: `Add ${entry}` }));
      await waitFor(() => expect(target).not.toBeInvalid());
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input[field]).toEqual(sent(['First Fixture', 'Second Fixture']));
    });

    it('lets the save through once text left in the box is cleared', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      type(entry, 'Stray Fixture');
      save();
      await waitFor(() => expect(box(entry)).toBeInvalid());
      type(entry, '');

      await waitFor(() => expect(box(entry)).not.toBeInvalid());
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input[field]).toEqual([]);
    });
  });

  describe.each(LISTS.filter((list) => list.ordered))(
    'moving an entry in the $legend list',
    ({ legend, entry, field }) => {
      const group = () => screen.getByRole('group', { name: legend });
      const sent = (values: string[]) =>
        field === 'deities' ? values.map((name) => ({ name })) : values;
      const entries = () =>
        within(group())
          .queryAllByRole('button', { name: /^Remove / })
          .map((button) => button.getAttribute('aria-label'));
      const handle = (value: string) =>
        within(group()).getByRole('button', { name: `Move ${value}` });
      const announced = () =>
        within(group())
          .getAllByRole('status')
          .map((region) => region.textContent)
          .join(' | ');

      beforeEach(layOutChips);
      afterEach(() => vi.restoreAllMocks());

      it('moves one by keyboard, says so, keeps the focus on it, and sends the new order', async () => {
        const calls = acceptCreate();
        const onSaved = renderForm();

        type('Name', 'Testwort');
        for (const value of ['First Fixture', 'Second Fixture', 'Third Fixture']) {
          addEntry(entry, value);
        }
        await moveByKeyboard(handle('Third Fixture'), 'ArrowLeft', 'ArrowLeft');

        expect(entries()).toEqual([
          'Remove Third Fixture',
          'Remove First Fixture',
          'Remove Second Fixture',
        ]);
        expect(announced()).toContain('Third Fixture put down at position 1 of 3.');
        expect(handle('Third Fixture')).toHaveFocus();
        save();

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(calls[0].input[field]).toEqual(
          sent(['Third Fixture', 'First Fixture', 'Second Fixture']),
        );
      });

      it('moves one by pointer, and sends the new order', async () => {
        const calls = acceptCreate();
        const onSaved = renderForm();

        type('Name', 'Testwort');
        for (const value of ['First Fixture', 'Second Fixture', 'Third Fixture']) {
          addEntry(entry, value);
        }
        // The first chip dragged onto the third's place, at 200–280px.
        await dragByPointer(handle('First Fixture'), 245);
        save();

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(calls[0].input[field]).toEqual(
          sent(['Second Fixture', 'Third Fixture', 'First Fixture']),
        );
      });

      // An error names an entry by its index, so a move that shifts the
      // entry it names must carry the error with it.
      it('keeps an error on the entry it names when another entry moves past it', async () => {
        renderGivenList(listOf(field), {
          [field]: ['First Fixture', 'Second Fixture', 'first fixture'].map((value) => ({
            value,
          })),
        });

        save();
        await waitFor(() =>
          expect(removeButton('first fixture')).toHaveAccessibleDescription(
            expect.stringContaining('already listed'),
          ),
        );
        await moveByKeyboard(handle('Second Fixture'), 'ArrowRight');

        expect(entries()).toEqual([
          'Remove First Fixture',
          'Remove first fixture',
          'Remove Second Fixture',
        ]);
        await waitFor(() =>
          expect(removeButton('first fixture')).toHaveAccessibleDescription(
            expect.stringContaining('already listed'),
          ),
        );
        expect(removeButton('Second Fixture')).not.toHaveAccessibleDescription();
      });
    },
  );

  // MB.174: a list refuses a repeat at the box, as the schema would at save,
  // and says why in its one error element.
  describe.each(LISTS)('a repeat at the $legend box', ({ legend, entry }) => {
    const group = () => screen.getByRole('group', { name: legend });
    const listed = () => within(group()).queryAllByRole('button', { name: /^Remove / });
    const changes = () => within(group()).getByRole('status', { name: `${legend} changes` });

    it('adds nothing at Add, keeps the text, and says why at the box', () => {
      renderForm();

      addEntry(entry, 'First Fixture');
      addEntry(entry, '  first FIXTURE ');

      expect(listed()).toHaveLength(1);
      expect(box(entry)).toHaveValue('  first FIXTURE ');
      expectErrorOn(box(entry), '"first FIXTURE" is already listed');
      expect(
        within(group()).getByText('"first FIXTURE" is already listed', { ignore: 'output' }),
      ).toBeInTheDocument();
      expect(changes()).toHaveTextContent('"first FIXTURE" is already listed');
      expect(box(entry)).toHaveFocus();
    });

    it('adds nothing on Enter, the same way', () => {
      renderForm();

      addEntry(entry, 'First Fixture');
      type(entry, 'first fixture');
      fireEvent.keyDown(box(entry), { key: 'Enter' });

      expect(listed()).toHaveLength(1);
      expect(box(entry)).toHaveValue('first fixture');
      expectErrorOn(box(entry), '"first fixture" is already listed');
    });

    it('clears the refusal once the text is edited, and adds what is no repeat', () => {
      renderForm();

      addEntry(entry, 'First Fixture');
      addEntry(entry, 'first fixture');
      type(entry, 'first fixtures');

      expect(box(entry)).not.toBeInvalid();
      // The announcement has been made; the error element no longer says it.
      expect(within(group()).queryByText(/is already listed/, { ignore: 'output' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: `Add ${entry}` }));
      expect(listed()).toHaveLength(2);
      expect(changes()).toHaveTextContent('Added first fixtures');
    });
  });

  it('refuses a folk name repeating the name, at the box', () => {
    renderForm();

    type('Name', 'Testwort');
    addEntry('Folk Name', ' testwort');

    expect(
      within(screen.getByRole('group', { name: 'Folk Names' })).queryAllByRole('button', {
        name: /^Remove /,
      }),
    ).toHaveLength(0);
    expectErrorOn(box('Folk Name'), '"testwort" is already the name');
  });

  // M5.10a: the form and folk-name boxes suggest from M4.7a's lookups.
  describe('the duplicate warning', () => {
    const TOMENTOSA: DuplicateNode = {
      id: 'claw-1',
      name: "Cat's Claw",
      canonicalName: 'Uncaria tomentosa',
    };
    const FELIS: DuplicateNode = { id: 'claw-2', name: "Cat's Claw", canonicalName: 'Felis catus' };
    const MOCKLEAF: DuplicateNode = { id: 'mock-1', name: 'Mockleaf', canonicalName: null };

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    const settle = () => act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
    const warning = () => screen.getByRole('status', { name: 'Possible duplicates' });
    const createAnyway = () => screen.queryByRole('button', { name: 'Create Anyway' });
    const SENTENCE = "Did you mean Cat's Claw (Uncaria tomentosa)?";

    it('asks once the name settles, with the whole name, about this coven', async () => {
      renderForm();
      const calls = offerDuplicates([]);

      type('Name', 'C');
      type('Name', 'Ca');
      type('Name', 'Cats Claw ');
      act(() => vi.advanceTimersByTime(DEBOUNCE_MS - 1));
      expect(calls).toHaveLength(0);

      settle();
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toEqual({ workspaceId: WORKSPACE_ID, name: 'Cats Claw', first: 3 });
    });

    it('asks nothing for a blank name, and drops the warning the last name had', async () => {
      renderForm();
      const calls = offerDuplicates([TOMENTOSA]);
      type('Name', 'Cats Claw');
      settle();
      await within(warning()).findByRole('link');

      type('Name', '   ');
      settle();

      expect(warning()).toBeEmptyDOMElement();
      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(calls).toHaveLength(1);
    });

    it('names each near match by its label and formal name, linked to the entry', async () => {
      renderForm();
      offerDuplicates([TOMENTOSA, FELIS, MOCKLEAF]);

      type('Name', 'Cats Claw');
      settle();

      const tomentosa = await within(warning()).findByRole('link', {
        name: "Cat's Claw (Uncaria tomentosa)",
      });
      expect(warning()).toHaveTextContent(
        "Did you mean Cat's Claw (Uncaria tomentosa), Cat's Claw (Felis catus) or Mockleaf?",
      );
      expect(tomentosa).toHaveAttribute('href', '/ingredients/claw-1');
      expect(screen.getByRole('link', { name: "Cat's Claw (Felis catus)" })).toHaveAttribute(
        'href',
        '/ingredients/claw-2',
      );
      expect(screen.getByRole('link', { name: 'Mockleaf' })).toHaveAttribute(
        'href',
        '/ingredients/mock-1',
      );
      // Read with the field, as its hint is, and not an error until a save meets it.
      expect(textbox('Name')).toHaveAccessibleDescription(expect.stringContaining('Did you mean'));
      expect(textbox('Name')).not.toBeInvalid();
    });

    it('warns of nothing when nothing is close', async () => {
      renderForm();
      const calls = offerDuplicates([]);

      type('Name', 'Fixture Nothingalike');
      settle();
      await waitFor(() => expect(calls).toHaveLength(1));

      expect(warning()).toBeEmptyDOMElement();
      expect(createAnyway()).not.toBeInTheDocument();
      expect(textbox('Name')).not.toHaveAccessibleDescription(
        expect.stringContaining('Did you mean'),
      );
    });

    it('holds a save until it is dismissed, as an error on the name, the focus on Create Anyway', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      offerDuplicates([TOMENTOSA]);

      type('Name', "Cat's Claw");
      settle();
      await within(warning()).findByRole('link');
      save();

      const button = createAnyway() as HTMLElement;
      await waitFor(() => expect(button).toHaveFocus());
      // The warning is read with the button, so the focus says why it moved.
      expect(button).toHaveAccessibleDescription(SENTENCE);
      expect(onSaved).not.toHaveBeenCalled();
      expect(saves).toHaveLength(0);
      expect(textbox('Name')).toBeInvalid();
      expect(textbox('Name')).toHaveAccessibleDescription(expect.stringContaining(SENTENCE));

      // Again, and it stops again.
      save();
      await waitFor(() => expect(button).toHaveFocus());
      expect(saves).toHaveLength(0);
    });

    it('checks a name saved before its typing settles, and holds on what it finds', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerDuplicates([TOMENTOSA]);

      type('Name', "Cat's Claw ");
      save();

      // No wait for the debounce: the save asks about the name it is sending.
      await waitFor(() => expect(createAnyway()).toHaveFocus());
      expect(calls).toEqual([{ workspaceId: WORKSPACE_ID, name: "Cat's Claw", first: 3 }]);
      expect(warning()).toHaveTextContent(SENTENCE);
      expect(textbox('Name')).toBeInvalid();
      expect(onSaved).not.toHaveBeenCalled();
      expect(saves).toHaveLength(0);
    });

    it('shows Save busy while it checks, and sends once nothing is close', async () => {
      let release = () => {};
      const checking = new Promise<void>((resolve) => {
        release = resolve;
      });
      const saves = acceptCreate();
      const onSaved = renderForm();
      server.use(
        graphqlLink.query<PossibleDuplicatesQuery, PossibleDuplicatesQueryVariables>(
          'PossibleDuplicates',
          async () => {
            await checking;
            return HttpResponse.json({ data: { possibleDuplicates: { edges: [] } } });
          },
        ),
      );
      const submit = screen.getByRole('button', { name: 'Save Ingredient' });

      type('Name', 'Fixture Nothingalike');
      save();

      await waitFor(() => expect(submit).toHaveAttribute('aria-busy', 'true'));
      expect(saves).toHaveLength(0);
      release();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.name).toBe('Fixture Nothingalike');
      expect(warning()).toBeEmptyDOMElement();
    });

    it('lifts the hold when the name changes, leaving the focus where the typing is', async () => {
      const saves = acceptCreate();
      renderForm();
      offerDuplicates([TOMENTOSA]);
      type('Name', "Cat's Claw");
      settle();
      await within(warning()).findByRole('link');
      save();
      await waitFor(() => expect(createAnyway()).toHaveFocus());

      // Back in the name, and a new match arrives as it is typed.
      offerDuplicates([TOMENTOSA, FELIS]);
      act(() => textbox('Name').focus());
      type('Name', "Cat's Claws");
      settle();
      await within(warning()).findByRole('link', { name: "Cat's Claw (Felis catus)" });

      expect(textbox('Name')).toHaveFocus();
      expect(textbox('Name')).not.toBeInvalid();
      expect(saves).toHaveLength(0);
    });

    it('lets an error elsewhere take the save first', async () => {
      const saves = acceptCreate();
      renderForm();
      offerDuplicates([TOMENTOSA]);

      type('Name', "Cat's Claw");
      choose('Classification', 'Botanical');
      settle();
      await within(warning()).findByRole('link');
      save();

      await waitFor(() => expect(textbox('Formal Name')).toHaveFocus());
      expect(createAnyway()).not.toHaveFocus();
      expect(saves).toHaveLength(0);
    });

    it('goes on Create Anyway, handing the focus back to the name, and then saves', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      offerDuplicates([TOMENTOSA]);

      type('Name', "Cat's Claw");
      settle();
      await within(warning()).findByRole('link');
      save();
      await waitFor(() => expect(createAnyway()).toHaveFocus());
      fireEvent.click(createAnyway() as HTMLElement);

      expect(warning()).toBeEmptyDOMElement();
      expect(textbox('Name')).toHaveFocus();
      expect(textbox('Name')).not.toBeInvalid();
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.name).toBe("Cat's Claw");
    });

    it('stays gone for the matches set aside, and returns for a new one', async () => {
      renderForm();
      offerDuplicates([TOMENTOSA]);

      type('Name', "Cat's Claw");
      settle();
      await within(warning()).findByRole('link');
      fireEvent.click(createAnyway() as HTMLElement);

      // A longer name finding the same entry: already answered.
      const again = offerDuplicates([TOMENTOSA]);
      type('Name', "Cat's Claws");
      settle();
      await waitFor(() => expect(again).toHaveLength(1));
      expect(warning()).toBeEmptyDOMElement();

      // One it has not been asked about.
      offerDuplicates([TOMENTOSA, FELIS]);
      type('Name', "Cat's Clawe");
      settle();
      const felis = await within(warning()).findByRole('link', {
        name: "Cat's Claw (Felis catus)",
      });
      expect(felis).toBeInTheDocument();
      expect(within(warning()).queryByRole('link', { name: /tomentosa/ })).not.toBeInTheDocument();
    });

    it('shows nothing, and saves, when the lookup fails', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      mockGraphQLError('PossibleDuplicates', { code: 'FORBIDDEN' });

      type('Name', "Cat's Claw");
      settle();
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves).toHaveLength(1);
      expect(warning()).toBeEmptyDOMElement();
    });
  });

  describe('the form lookup', () => {
    const ANIMAL_WAX_ID = '2c9e4b1a-7d3f-4e8a-9b6c-5f0a1d2e3c4b';
    const SUBSTANCE_WAX_ID = '6e1f2a3b-4c5d-4e7f-8a9b-0c1d2e3f4a5b';
    const WAX_ANIMAL: FormNode = {
      id: ANIMAL_WAX_ID,
      value: 'Wax',
      description: null,
      group: 'Animal',
      curated: true,
      claimants: [{ name: 'Testwort', canonicalName: 'Fixtura testalis' }],
    };
    const WAX_SUBSTANCE: FormNode = {
      id: SUBSTANCE_WAX_ID,
      value: 'Wax',
      description: 'Candle and poppet wax.',
      group: 'Substance',
      curated: true,
      claimants: [],
    };
    // In use only: no curated row, so nothing to pick.
    const RHIZOMES: FormNode = {
      id: null,
      value: 'Rhizomes',
      description: null,
      group: null,
      curated: false,
      claimants: [{ name: 'Mockleaf', canonicalName: null }],
    };

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    const settle = () => act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
    /** Focuses the box, which starts its lookup, and waits for that first, empty ask. */
    const use = async (name: string, calls: unknown[]) => {
      act(() => box(name).focus());
      await waitFor(() => expect(calls).toHaveLength(1));
    };

    it('asks once the typing settles, not on each keystroke, about this coven', async () => {
      renderForm();
      const calls = offerForms([WAX_ANIMAL]);

      await use('Form', calls);
      type('Form', 'w');
      type('Form', 'wa');
      type('Form', 'wax');
      act(() => vi.advanceTimersByTime(DEBOUNCE_MS - 1));
      expect(calls).toHaveLength(1);

      settle();
      await waitFor(() => expect(calls).toHaveLength(2));
      expect(calls[1]).toEqual({ workspaceId: WORKSPACE_ID, query: 'wax', first: 10 });
    });

    it('asks nothing until the box is used', () => {
      renderForm();
      const calls = offerForms([WAX_ANIMAL]);

      settle();

      expect(calls).toHaveLength(0);
    });

    it('offers the vocabulary first, each with its group and who claims it, then forms in use', async () => {
      renderForm();
      const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE, RHIZOMES]);

      await use('Form', calls);
      type('Form', 'wax');
      settle();

      const curated = await screen.findByRole('group', { name: 'From Compendium' });
      // Two same-named forms, told apart by the group in each one's name.
      expect(within(curated).getByRole('option', { name: /^Wax \(Animal\)/ })).toHaveTextContent(
        'Used by Testwort (Fixtura testalis)',
      );
      expect(within(curated).getByRole('option', { name: /^Wax \(Substance\)/ })).toHaveTextContent(
        'Candle and poppet wax.',
      );
      const inUse = screen.getByRole('group', { name: 'From Coven' });
      expect(within(inUse).getByRole('option', { name: /^Rhizomes/ })).toHaveTextContent(
        'Used by Mockleaf',
      );
      // What was typed comes first, the owner's call.
      const rows = within(screen.getByRole('listbox', { name: 'Form suggestions' }));
      expect(rows.getAllByRole('option')[0]).toHaveAccessibleName('Use what you typed: wax');
    });

    /** Looks up "wax" in the Form box and picks the row named `option`. */
    const pickWax = async (calls: unknown[], option: RegExp) => {
      await use('Form', calls);
      type('Form', 'wax');
      settle();
      fireEvent.click(await screen.findByRole('option', { name: option }));
    };
    // The group a pick shows inside the box, not the tooltip that repeats it.
    const group = (text: string) =>
      within(box('Form').closest('.combobox') as HTMLElement).queryByText(text, {
        ignore: '[role="tooltip"]',
      });

    // MB.169: the text alone reads the same for both Waxes; the group tells
    // which was picked, and the id records it.
    it('fills the field from a pick, shows its group in the box and sends its id', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE]);

      await pickWax(calls, /^Wax \(Substance\)/);

      expect(box('Form')).toHaveValue('Wax');
      expect(box('Form')).toHaveAttribute('aria-expanded', 'false');
      expect(group('(Substance)')).toBeInTheDocument();
      expect(box('Form')).toHaveAccessibleDescription(
        expect.stringContaining('(Substance) Candle and poppet wax.'),
      );
      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input).toMatchObject({ form: 'Wax', formId: SUBSTANCE_WAX_ID });
    });

    it('tells two same-named picks apart, the last pick replacing the first', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE]);

      await pickWax(calls, /^Wax \(Substance\)/);
      act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
      fireEvent.click(screen.getByRole('button', { name: 'Show Form suggestions' }));
      fireEvent.click(await screen.findByRole('option', { name: /^Wax \(Animal\)/ }));

      expect(group('(Animal)')).toBeInTheDocument();
      expect(group('(Substance)')).not.toBeInTheDocument();
      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.formId).toBe(ANIMAL_WAX_ID);
    });

    it('shows the group’s description in a tooltip on hover and on focus, closed by Escape', async () => {
      renderForm();
      const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE]);
      await pickWax(calls, /^Wax \(Substance\)/);
      const field = within(box('Form').closest('.combobox') as HTMLElement);
      act(() => box('Form').blur());

      expect(field.queryByRole('tooltip')).not.toBeInTheDocument();
      fireEvent.mouseEnter(group('(Substance)') as HTMLElement);
      expect(field.getByRole('tooltip')).toHaveTextContent('Candle and poppet wax.');
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(field.queryByRole('tooltip')).not.toBeInTheDocument();

      act(() => box('Form').focus());
      expect(field.getByRole('tooltip')).toHaveTextContent('Candle and poppet wax.');
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(field.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('shows the group of a form with no description, and no tooltip', async () => {
      renderForm();
      const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE]);

      await pickWax(calls, /^Wax \(Animal\)/);
      fireEvent.mouseEnter(group('(Animal)') as HTMLElement);

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(box('Form')).toHaveAccessibleDescription(expect.stringMatching(/\(Animal\)$/));
    });

    // The owner's call: the text is still the member's to edit, and an edit
    // away from the pick leaves typed text, which links nothing.
    it('drops the group and the id once the text is edited away from the pick', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE]);

      await pickWax(calls, /^Wax \(Substance\)/);
      type('Form', 'Waxe');
      type('Form', 'Wax');

      expect(group('(Substance)')).not.toBeInTheDocument();
      expect(box('Form')).not.toHaveAccessibleDescription(expect.stringContaining('Substance'));
      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input).toMatchObject({ form: 'Wax', formId: null });
    });

    it('records no pick for a form only in use, which has no curated row', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerForms([RHIZOMES]);

      await use('Form', calls);
      type('Form', 'rhiz');
      settle();
      fireEvent.click(await screen.findByRole('option', { name: /^Rhizomes/ }));

      expect(box('Form')).toHaveValue('Rhizomes');
      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input).toMatchObject({ form: 'Rhizomes', formId: null });
    });

    it('clears the pick with the rest of the form after Save & Add Another', async () => {
      acceptCreate();
      const onSaved = renderForm();
      const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE]);

      await pickWax(calls, /^Wax \(Substance\)/);
      type('Name', 'Testwort');
      saveAnother();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());

      await waitFor(() => expect(box('Form')).toHaveValue(''));
      expect(group('(Substance)')).not.toBeInTheDocument();
    });

    it('takes a value in no vocabulary from its own row, with no warning', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerForms([]);

      await use('Form', calls);
      type('Form', 'rhizome');
      settle();
      fireEvent.click(await screen.findByRole('option', { name: 'Use what you typed: rhizome' }));

      expect(box('Form')).toHaveValue('rhizome');
      expect(box('Form')).not.toBeInvalid();
      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input).toMatchObject({ form: 'rhizome', formId: null });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('the folk-name lookup', () => {
    const HEDGE: NameNode = {
      value: 'Hedge Fixture',
      claimants: [{ name: 'Testwort', canonicalName: 'Fixtura testalis' }],
    };

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('suggests the names in use, with who claims them, and a pick adds an entry', async () => {
      renderForm();
      const calls = offerNames([HEDGE]);

      act(() => box('Folk Name').focus());
      await waitFor(() => expect(calls).toHaveLength(1));
      type('Folk Name', 'hedge');
      act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
      await waitFor(() => expect(calls).toHaveLength(2));
      expect(calls[1]).toEqual({ workspaceId: WORKSPACE_ID, query: 'hedge', first: 10 });

      const option = await screen.findByRole('option', { name: /^Hedge Fixture/ });
      expect(option).toHaveTextContent('Used by Testwort (Fixtura testalis)');
      // One bucket: there is no curated vocabulary of common names.
      expect(screen.queryByRole('group', { name: 'From Compendium' })).not.toBeInTheDocument();
      fireEvent.click(option);

      expect(removeButton('Hedge Fixture')).toBeInTheDocument();
      expect(box('Folk Name')).toHaveValue('');
      expect(box('Folk Name')).toHaveFocus();
      expect(
        within(screen.getByRole('group', { name: 'Folk Names' })).getByRole('status', {
          name: 'Folk Names changes',
        }),
      ).toHaveTextContent('Added Hedge Fixture');
    });

    it('picks by the keyboard, then adds typed text on Enter with nothing picked', async () => {
      renderForm();
      const calls = offerNames([HEDGE]);

      act(() => box('Folk Name').focus());
      await waitFor(() => expect(calls).toHaveLength(1));
      type('Folk Name', 'hedge');
      act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
      await screen.findByRole('option', { name: /^Hedge Fixture/ });
      // Past the typed row, which comes first, onto the suggestion.
      fireEvent.keyDown(box('Folk Name'), { key: 'ArrowDown' });
      fireEvent.keyDown(box('Folk Name'), { key: 'ArrowDown' });
      fireEvent.keyDown(box('Folk Name'), { key: 'Enter' });
      expect(removeButton('Hedge Fixture')).toBeInTheDocument();

      type('Folk Name', 'Fixture Bane');
      fireEvent.keyDown(box('Folk Name'), { key: 'Enter' });
      expect(removeButton('Fixture Bane')).toBeInTheDocument();
      expect(box('Folk Name')).toHaveValue('');
    });

    it('leaves out a name already listed, and the ingredient’s name', async () => {
      renderForm();
      const calls = offerNames([
        HEDGE,
        { value: 'Testwort', claimants: [] },
        { value: 'Fixture Bane', claimants: [] },
      ]);

      type('Name', 'Testwort');
      addEntry('Folk Name', 'hedge fixture');
      act(() => box('Folk Name').focus());
      await waitFor(() => expect(calls).toHaveLength(1));
      type('Folk Name', 'e');
      act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
      await waitFor(() => expect(calls).toHaveLength(2));

      await screen.findByRole('option', { name: 'Fixture Bane' });
      expect(screen.queryByRole('option', { name: /^Hedge Fixture/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Testwort' })).not.toBeInTheDocument();
    });
  });

  // MB.131: the planets, signs, deities and substitutes suggest, each from its
  // own source, and a pick adds an entry as Add does.
  describe('the list lookups', () => {
    const MOON: CorrespondenceNode = {
      value: 'Moon',
      description: 'Rules the night and the tides.',
      curated: true,
    };
    const MOONFIXTURE: CorrespondenceNode = {
      value: 'Moonfixture',
      description: null,
      curated: false,
    };
    const CANCER: CorrespondenceNode = { value: 'Cancer', description: 'The crab.', curated: true };
    const CANCERFIXTURE: CorrespondenceNode = {
      value: 'Cancerfixture',
      description: null,
      curated: false,
    };
    const GREEK_HECATE_ID = '4b2a6c8e-1d3f-4a5b-9c7d-8e0f1a2b3c4d';
    const ROMAN_HECATE_ID = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';
    const HECATE_GREEK: DeityNode = {
      id: GREEK_HECATE_ID,
      value: 'Hecate',
      description: 'Of crossroads and the moon.',
      tradition: 'Greek',
      curated: true,
    };
    const HECATE_ROMAN: DeityNode = {
      id: ROMAN_HECATE_ID,
      value: 'Hecate',
      description: null,
      tradition: 'Roman',
      curated: true,
    };
    // In use only: no curated row, so nothing to pick.
    const HECATE_FIXTURE: DeityNode = {
      id: null,
      value: 'Hecate Fixturia',
      description: null,
      tradition: null,
      curated: false,
    };
    const COMPENDIUM_ID = '0d4f2c1a-6b3e-4a5d-8c7f-9e0a1b2c3d4e';
    const COVEN_ID = '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d';
    const BARE_ID = '9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f';
    const MOCKWORT_COMPENDIUM: IngredientNode = {
      id: COMPENDIUM_ID,
      name: 'Mockwort',
      canonicalName: 'Fixtura vulgaris',
      form: 'Dried leaf',
      description: 'A fixture herb.',
      isGlobal: true,
    };
    // The same label and formal name in another form: only the tooltip tells
    // the two apart once one is picked (MB.164).
    const MOCKWORT_COVEN: IngredientNode = {
      ...MOCKWORT_COMPENDIUM,
      id: COVEN_ID,
      form: 'Tincture',
      isGlobal: false,
    };
    const MOCKWORT_TEA: IngredientNode = {
      id: BARE_ID,
      name: 'Mockwort Tea',
      canonicalName: null,
      form: null,
      description: null,
      isGlobal: false,
    };

    const LOOKUPS = [
      {
        legend: 'Planets',
        entry: 'Planet',
        offer: () => offerPlanets([MOON, MOONFIXTURE]),
        option: /^Moon Rules/,
        value: 'Moon',
      },
      {
        legend: 'Zodiac Signs',
        entry: 'Zodiac Sign',
        offer: () => offerSigns([CANCER, CANCERFIXTURE]),
        option: /^Cancer The crab/,
        value: 'Cancer',
      },
      {
        legend: 'Deities',
        entry: 'Deity',
        offer: () => offerDeities([HECATE_GREEK, HECATE_FIXTURE]),
        // A pick reads with its tradition, as its row does (MB.169).
        option: /^Hecate \(Greek\)/,
        value: 'Hecate (Greek)',
      },
      {
        legend: 'Substitute Ingredients',
        entry: 'Substitute Ingredient',
        offer: () => offerIngredients([MOCKWORT_COVEN]),
        option: /^Mockwort/,
        value: 'Mockwort',
      },
    ];

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    const settle = () => act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
    /** Focuses the box, waits for its first, empty ask, then types `text` and lets it settle. */
    const lookUp = async (entry: string, calls: unknown[], text: string) => {
      act(() => box(entry).focus());
      await waitFor(() => expect(calls).toHaveLength(1));
      type(entry, text);
      settle();
      await waitFor(() => expect(calls).toHaveLength(2));
    };
    const changes = (legend: string) =>
      within(screen.getByRole('group', { name: legend })).getByRole('status', {
        name: `${legend} changes`,
      });

    it.each(LOOKUPS)(
      'asks about $legend for this coven once the typing settles, and not before the box is used',
      async ({ entry, offer }) => {
        renderForm();
        const calls = offer();

        settle();
        expect(calls).toHaveLength(0);

        act(() => box(entry).focus());
        await waitFor(() => expect(calls).toHaveLength(1));
        type(entry, 'm');
        type(entry, 'mo');
        act(() => vi.advanceTimersByTime(DEBOUNCE_MS - 1));
        expect(calls).toHaveLength(1);

        settle();
        await waitFor(() => expect(calls).toHaveLength(2));
        expect(calls[1]).toEqual({ workspaceId: WORKSPACE_ID, query: 'mo', first: 10 });
      },
    );

    it.each([
      { legend: 'Planets', entry: 'Planet', offer: offerPlanets, rows: [MOON, MOONFIXTURE] },
      {
        legend: 'Zodiac Signs',
        entry: 'Zodiac Sign',
        offer: offerSigns,
        rows: [CANCER, CANCERFIXTURE],
      },
    ])(
      'offers the curated $legend apart from those in use, with their descriptions',
      async ({ entry, offer, rows: [curated, inUse] }) => {
        renderForm();
        const calls = offer([curated, inUse]);

        await lookUp(entry, calls, curated.value.slice(0, 3));

        const group = await screen.findByRole('group', { name: 'From Compendium' });
        expect(
          within(group).getByRole('option', { name: new RegExp(`^${curated.value}`) }),
        ).toHaveTextContent(curated.description as string);
        expect(
          within(screen.getByRole('group', { name: 'From Coven' })).getByRole('option', {
            name: inUse.value,
          }),
        ).toBeInTheDocument();
      },
    );

    it('offers a curated deity with its tradition, telling two of one name apart, and one in use without', async () => {
      renderForm();
      const calls = offerDeities([HECATE_GREEK, HECATE_ROMAN, HECATE_FIXTURE]);

      await lookUp('Deity', calls, 'hecate');

      const curated = await screen.findByRole('group', { name: 'From Compendium' });
      expect(within(curated).getByRole('option', { name: /^Hecate \(Greek\)/ })).toHaveTextContent(
        'Of crossroads and the moon.',
      );
      expect(within(curated).getByRole('option', { name: 'Hecate (Roman)' })).toBeInTheDocument();
      expect(
        within(screen.getByRole('group', { name: 'From Coven' })).getByRole('option', {
          name: 'Hecate Fixturia',
        }),
      ).toBeInTheDocument();
    });

    it.each(LOOKUPS.slice(0, 3))(
      'adds a picked $legend entry as its value, empties the box and keeps the focus',
      async ({ legend, entry, offer, option, value }) => {
        renderForm();
        const calls = offer();

        await lookUp(entry, calls, 'mo');
        fireEvent.click(await screen.findByRole('option', { name: option }));

        expect(removeButton(value)).toBeInTheDocument();
        expect(box(entry)).toHaveValue('');
        expect(box(entry)).toHaveFocus();
        expect(changes(legend)).toHaveTextContent(`Added ${value}`);
      },
    );

    it('picks a deity by the keyboard, closes on Escape, and adds typed text on Enter with none open', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerDeities([HECATE_GREEK, HECATE_FIXTURE]);

      await lookUp('Deity', calls, 'hecate');
      await screen.findByRole('option', { name: /^Hecate \(Greek\)/ });
      // Past the typed row, which comes first, onto the suggestion.
      fireEvent.keyDown(box('Deity'), { key: 'ArrowDown' });
      fireEvent.keyDown(box('Deity'), { key: 'ArrowDown' });
      expect(box('Deity')).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: /^Hecate \(Greek\)/ }).id,
      );
      fireEvent.keyDown(box('Deity'), { key: 'Enter' });
      expect(removeButton('Hecate (Greek)')).toBeInTheDocument();

      type('Deity', 'Fixture of the Hedge');
      settle();
      await waitFor(() => expect(box('Deity')).toHaveAttribute('aria-expanded', 'true'));
      fireEvent.keyDown(box('Deity'), { key: 'Escape' });
      expect(box('Deity')).toHaveAttribute('aria-expanded', 'false');
      expect(box('Deity')).toHaveValue('Fixture of the Hedge');

      fireEvent.keyDown(box('Deity'), { key: 'Enter' });
      expect(removeButton('Fixture of the Hedge')).toBeInTheDocument();
      expect(box('Deity')).toHaveValue('');

      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.deities).toEqual([
        { deityId: GREEK_HECATE_ID },
        { name: 'Fixture of the Hedge' },
      ]);
    });

    // MB.169: the same name in two traditions, told apart on the pill as in
    // the list, and saved as two picks.
    it('adds Greek and Roman Hecate as two pills, each with its tradition, and sends two ids', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerDeities([HECATE_GREEK, HECATE_ROMAN]);

      await lookUp('Deity', calls, 'hecate');
      fireEvent.click(await screen.findByRole('option', { name: /^Hecate \(Greek\)/ }));
      expect(changes('Deities')).toHaveTextContent('Added Hecate (Greek)');
      type('Deity', 'hecate');
      settle();
      fireEvent.click(await screen.findByRole('option', { name: 'Hecate (Roman)' }));

      // Its description in its tooltip and its x's description, as a linked
      // substitute's detail is (MB.164); a deity with none has nothing more.
      expect(removeButton('Hecate (Greek)')).toHaveAccessibleDescription(
        'Of crossroads and the moon.',
      );
      expect(removeButton('Hecate (Roman)')).not.toHaveAccessibleDescription();
      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.deities).toEqual([
        { deityId: GREEK_HECATE_ID },
        { deityId: ROMAN_HECATE_ID },
      ]);
    });

    // MB.170: a move carries a pick's link with it, so the order sent is of
    // links and names alike, and MB.167's replace stores it as positions.
    it('sends a picked deity and a typed one in the order they were moved to', async () => {
      layOutChips();
      onTestFinished(() => {
        vi.restoreAllMocks();
      });
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerDeities([HECATE_GREEK]);

      await lookUp('Deity', calls, 'hecate');
      fireEvent.click(await screen.findByRole('option', { name: /^Hecate \(Greek\)/ }));
      addEntry('Deity', 'Fixture of the Hedge');
      await moveByKeyboard(
        screen.getByRole('button', { name: 'Move Fixture of the Hedge' }),
        'ArrowLeft',
      );

      expect(removeButton('Hecate (Greek)')).toHaveAccessibleDescription(
        'Of crossroads and the moon.',
      );
      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.deities).toEqual([
        { name: 'Fixture of the Hedge' },
        { deityId: GREEK_HECATE_ID },
      ]);
    });

    // Given the repeat, since the lookup never offers a listed deity (MB.174).
    it('refuses the same deity picked twice, beside the repeat, named with its tradition', async () => {
      const greek = {
        value: 'Hecate',
        link: { id: GREEK_HECATE_ID, tradition: 'Greek', description: null },
      };
      renderGivenList(listOf('deities'), { deities: [greek, greek] });

      save();

      await waitFor(() =>
        expectErrorOn(box('Deity'), 'Hecate (Greek): This deity is already listed'),
      );
    });

    it('adds a deity only in use as its name, read and sent as typed', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerDeities([HECATE_FIXTURE]);

      await lookUp('Deity', calls, 'hecate');
      fireEvent.click(await screen.findByRole('option', { name: 'Hecate Fixturia' }));

      expect(removeButton('Hecate Fixturia')).not.toHaveAccessibleDescription();
      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.deities).toEqual([{ name: 'Hecate Fixturia' }]);
    });

    it('offers each ingredient with its formal name and whose entry it is, in the order found', async () => {
      renderForm();
      const calls = offerIngredients([MOCKWORT_COMPENDIUM, MOCKWORT_COVEN, MOCKWORT_TEA]);

      await lookUp('Substitute Ingredient', calls, 'mockwort');

      await screen.findByRole('option', { name: /^Mockwort Tea/ });
      const rows = within(
        screen.getByRole('listbox', { name: 'Substitute Ingredient suggestions' }),
      )
        .getAllByRole('option')
        .slice(1);
      expect(rows.map((row) => row.textContent)).toEqual([
        'Mockwort (Fixtura vulgaris)Compendium entry',
        'Mockwort (Fixtura vulgaris)This coven’s entry',
        'Mockwort TeaThis coven’s entry',
      ]);
      // One ranked list: a tier is a note, never a heading that reorders it.
      expect(screen.queryByRole('group', { name: 'From Compendium' })).not.toBeInTheDocument();
    });

    it('saves a picked ingredient as a link, its entry reading as that ingredient', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerIngredients([MOCKWORT_COMPENDIUM, MOCKWORT_COVEN, MOCKWORT_TEA]);

      await lookUp('Substitute Ingredient', calls, 'mockwort');
      fireEvent.click(
        await screen.findByRole('option', {
          name: 'Mockwort (Fixtura vulgaris) This coven’s entry',
        }),
      );
      // The chip reads as the compendium's Mockwort would; its detail says
      // which was picked (MB.164).
      expect(removeButton('Mockwort (Fixtura vulgaris)')).toHaveAccessibleDescription(
        'Tincture · This coven’s entry — A fixture herb.',
      );
      expect(changes('Substitute Ingredients')).toHaveTextContent(
        'Added Mockwort (Fixtura vulgaris)',
      );

      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.substitutes).toEqual([{ ingredientId: COVEN_ID }]);
    });

    it('saves a substitute typed without a pick as text, added or taken from its own row, with no warning', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerIngredients([MOCKWORT_COVEN]);

      await lookUp('Substitute Ingredient', calls, 'Zest Root');
      await screen.findByRole('option', { name: /^Mockwort/ });
      fireEvent.keyDown(box('Substitute Ingredient'), { key: 'Enter' });
      type('Substitute Ingredient', 'Mockwort Rind');
      settle();
      fireEvent.click(
        await screen.findByRole('option', { name: 'Use what you typed: Mockwort Rind' }),
      );

      expect(removeButton('Zest Root')).toBeInTheDocument();
      expect(removeButton('Mockwort Rind')).toBeInTheDocument();
      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.substitutes).toEqual([
        { name: 'Zest Root' },
        { name: 'Mockwort Rind' },
      ]);
      expect(box('Substitute Ingredient')).not.toBeInvalid();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // MB.174: each lookup leaves out what its list holds, by the schema's key,
  // and the typed row is withheld for text the list would refuse.
  describe('a lookup beside its listed entries', () => {
    const MOON: CorrespondenceNode = { value: 'Moon', description: null, curated: true };
    const MOONFIXTURE: CorrespondenceNode = {
      value: 'Moonfixture',
      description: null,
      curated: false,
    };
    const CANCER: CorrespondenceNode = { value: 'Cancer', description: null, curated: true };
    const CANCERFIXTURE: CorrespondenceNode = {
      value: 'Cancerfixture',
      description: null,
      curated: false,
    };
    const HECATE_GREEK: DeityNode = {
      id: '4b2a6c8e-1d3f-4a5b-9c7d-8e0f1a2b3c4d',
      value: 'Hecate',
      description: null,
      tradition: 'Greek',
      curated: true,
    };
    const HECATE_ROMAN: DeityNode = {
      ...HECATE_GREEK,
      id: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
      tradition: 'Roman',
    };
    const HECATE_FIXTURE: DeityNode = {
      id: null,
      value: 'Hecate Fixturia',
      description: null,
      tradition: null,
      curated: false,
    };
    const MOCKWORT: IngredientNode = {
      id: '0d4f2c1a-6b3e-4a5d-8c7f-9e0a1b2c3d4e',
      name: 'Mockwort',
      canonicalName: null,
      form: 'Dried leaf',
      description: null,
      isGlobal: true,
    };
    const MOCKWORT_COVEN: IngredientNode = {
      ...MOCKWORT,
      id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
      form: 'Tincture',
      isGlobal: false,
    };

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    const settle = () => act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
    const lookUp = async (entry: string, calls: unknown[], text: string) => {
      act(() => box(entry).focus());
      await waitFor(() => expect(calls).toHaveLength(1));
      type(entry, text);
      settle();
      await waitFor(() => expect(calls).toHaveLength(2));
    };
    /** Types `text` into a box whose lookup has answered before, and waits for its rows. */
    const retype = async (entry: string, text: string, row: RegExp | string) => {
      type(entry, text);
      settle();
      await screen.findByRole('option', { name: row });
    };
    const typedRow = (text: string) =>
      screen.queryByRole('option', { name: `Use what you typed: ${text}` });

    it.each([
      {
        entry: 'Planet',
        offer: () => offerPlanets([MOON, MOONFIXTURE]),
        listed: 'Moon',
        other: 'Moonfixture',
      },
      {
        entry: 'Zodiac Sign',
        offer: () => offerSigns([CANCER, CANCERFIXTURE]),
        listed: 'Cancer',
        other: 'Cancerfixture',
      },
    ])(
      'leaves a listed $entry out whatever its case, and offers what was typed only when it is no repeat',
      async ({ entry, offer, listed, other }) => {
        renderForm();
        const calls = offer();

        addEntry(entry, listed.toLowerCase());
        await lookUp(entry, calls, listed.slice(0, 2));

        await screen.findByRole('option', { name: other });
        expect(screen.queryByRole('option', { name: listed })).not.toBeInTheDocument();
        expect(typedRow(listed.slice(0, 2))).toBeInTheDocument();

        await retype(entry, ` ${listed.toUpperCase()} `, other);
        expect(typedRow(listed.toUpperCase())).not.toBeInTheDocument();
      },
    );

    it('leaves out a listed deity by its id, so Roman Hecate is offered beside a listed Greek one', async () => {
      renderForm();
      const calls = offerDeities([HECATE_GREEK, HECATE_ROMAN, HECATE_FIXTURE]);

      await lookUp('Deity', calls, 'hecate');
      fireEvent.click(await screen.findByRole('option', { name: 'Hecate (Greek)' }));
      await retype('Deity', 'hecate', 'Hecate (Roman)');

      expect(screen.queryByRole('option', { name: 'Hecate (Greek)' })).not.toBeInTheDocument();
      // Text beside a link is no repeat, as at save: what was typed is offered, and added.
      expect(typedRow('hecate')).toBeInTheDocument();
      fireEvent.keyDown(box('Deity'), { key: 'Enter' });
      expect(removeButton('hecate')).toBeInTheDocument();
      expect(removeButton('Hecate (Greek)')).toBeInTheDocument();
    });

    it('leaves out a deity only in use once its name is listed, among the typed ones', async () => {
      renderForm();
      const calls = offerDeities([HECATE_GREEK, HECATE_FIXTURE]);

      addEntry('Deity', 'hecate fixturia');
      await lookUp('Deity', calls, 'hecate');

      await screen.findByRole('option', { name: 'Hecate (Greek)' });
      expect(screen.queryByRole('option', { name: 'Hecate Fixturia' })).not.toBeInTheDocument();
      await retype('Deity', 'Hecate Fixturia', 'Hecate (Greek)');
      expect(typedRow('Hecate Fixturia')).not.toBeInTheDocument();
    });

    it('leaves out a listed substitute by its ingredient’s id, and takes its name as typed text', async () => {
      renderForm();
      const calls = offerIngredients([MOCKWORT, MOCKWORT_COVEN]);

      await lookUp('Substitute Ingredient', calls, 'mockwort');
      fireEvent.click(await screen.findByRole('option', { name: 'Mockwort This coven’s entry' }));
      await retype('Substitute Ingredient', 'mockwort', 'Mockwort Compendium entry');

      expect(
        screen.queryByRole('option', { name: 'Mockwort This coven’s entry' }),
      ).not.toBeInTheDocument();
      expect(typedRow('mockwort')).toBeInTheDocument();
      fireEvent.keyDown(box('Substitute Ingredient'), { key: 'Enter' });
      expect(screen.getAllByRole('button', { name: 'Remove mockwort' })).toHaveLength(1);

      // A second typed one is a repeat of the first, not of the link.
      await retype('Substitute Ingredient', 'MOCKWORT', 'Mockwort Compendium entry');
      expect(typedRow('MOCKWORT')).not.toBeInTheDocument();
      fireEvent.keyDown(box('Substitute Ingredient'), { key: 'Enter' });
      expectErrorOn(box('Substitute Ingredient'), '"MOCKWORT" is already listed');
    });
  });

  // The field on its own, given its elements as an edit would be: drawn as
  // chips in the order held, and a repeat refused on the control itself.
  describe('an element list given its values', () => {
    function renderElements(elements: IngredientElement[]) {
      const onSubmit = vi.fn();
      const Harness = () => {
        const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
          defaultValues: { ...EMPTY_VALUES, name: 'Testwort', elements },
          resolver: ingredientResolver,
        });
        return (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <MultiSelectField
                name="elements"
                label="Element"
                placeholder="Choose elements"
                options={[
                  { value: 'earth', label: 'Earth' },
                  { value: 'air', label: 'Air' },
                  { value: 'fire', label: 'Fire' },
                  { value: 'water', label: 'Water' },
                  { value: 'spirit', label: 'Spirit' },
                ]}
              />
              <button type="submit">Save Ingredient</button>
            </form>
          </FormProvider>
        );
      };
      render(<Harness />);
      return onSubmit;
    }

    it('prefills them as chips, in the order held, and offers only the rest', () => {
      renderElements(['water', 'earth']);

      const control = select('Element').closest('.combobox__control') as HTMLElement;
      expect(
        within(control)
          .getAllByRole('button', { name: /^Remove/ })
          .map((button) => button.getAttribute('aria-label')),
      ).toEqual(['Remove Water', 'Remove Earth']);
      fireEvent.click(select('Element'));
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Air',
        'Fire',
        'Spirit',
      ]);
    });

    it('shows a repeat the schema refuses on the Element control', async () => {
      const onSubmit = renderElements(['fire', 'fire']);

      save();

      await waitFor(() => expectErrorOn(select('Element'), 'already chosen'));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // MB.140: a substitute links an ingredient or names one. The lookup above
  // picks a link; here the list is given one, to show and send it alone.
  describe('a linked substitute', () => {
    const LINKED_ID = '3f6c1d2e-8a4b-4c5d-9e0f-1a2b3c4d5e6f';
    const linked: SubstituteListEntry = {
      value: 'Mockleaf',
      link: {
        id: LINKED_ID,
        canonicalName: 'Fixtura testalis',
        form: 'Dried leaf',
        description: 'A fixture herb.',
        isGlobal: true,
      },
    };
    const bare = { ...linked.link!, canonicalName: null, form: null, description: null };

    function renderList(substitutes: SubstituteListEntry[]) {
      const onSubmit = vi.fn();
      const Harness = () => {
        const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
          defaultValues: { ...EMPTY_VALUES, name: 'Testwort', substitutes },
          resolver: ingredientResolver,
        });
        return (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <ListField
                name="substitutes"
                legend="Substitute Ingredients"
                entry="Substitute Ingredient"
              />
              <button type="submit">Save Ingredient</button>
            </form>
          </FormProvider>
        );
      };
      render(<Harness />);
      return onSubmit;
    }

    it('reads as its ingredient’s label with its formal name', () => {
      renderList([linked, { value: 'Zest Root' }]);

      const list = within(screen.getByRole('group', { name: 'Substitute Ingredients' }));
      expect(
        list.getByText('Mockleaf (Fixtura testalis)', { ignore: '[role="tooltip"]' }),
      ).toBeInTheDocument();
      expect(removeButton('Mockleaf (Fixtura testalis)')).toBeInTheDocument();
      expect(removeButton('Zest Root')).toBeInTheDocument();
    });

    it('reads as its label alone when the ingredient has no formal name', () => {
      renderList([{ value: 'Mockleaf', link: bare }]);

      expect(removeButton('Mockleaf')).toBeInTheDocument();
    });

    // MB.164: what the pill leaves out, in its tooltip and its x's description.
    it('tells its form, whose entry it is and its description in a tooltip', () => {
      renderList([linked]);
      const group = within(screen.getByRole('group', { name: 'Substitute Ingredients' }));

      fireEvent.mouseEnter(
        group.getByText('Mockleaf (Fixtura testalis)', { ignore: '[role="tooltip"]' }),
      );

      expect(group.getByRole('tooltip')).toHaveTextContent(
        'Dried leaf · Compendium entry — A fixture herb.',
      );
      expect(removeButton('Mockleaf (Fixtura testalis)')).toHaveAccessibleDescription(
        'Dried leaf · Compendium entry — A fixture herb.',
      );
    });

    it('tells whose entry it is alone when the ingredient has no form or description', () => {
      renderList([{ value: 'Mockleaf', link: bare }]);

      expect(removeButton('Mockleaf')).toHaveAccessibleDescription('Compendium entry');
    });

    it('tells nothing more of a typed substitute', () => {
      renderList([{ value: 'Zest Root' }]);

      expect(removeButton('Zest Root')).not.toHaveAccessibleDescription();
    });

    it('is sent as its ingredient’s id, beside a typed one sent as its name', async () => {
      const onSubmit = renderList([linked, { value: 'Zest Root' }]);

      save();

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].substitutes).toEqual([
        { ingredientId: LINKED_ID },
        { name: 'Zest Root' },
      ]);
    });

    it('marks a refused link beside its pill, named by its formal name too', async () => {
      renderList([linked, { value: 'Zest Root' }, { ...linked, value: 'Mockleaf' }]);

      save();

      await waitFor(() =>
        expectErrorOn(
          box('Substitute Ingredient'),
          'Mockleaf (Fixtura testalis): This ingredient is already listed',
        ),
      );
    });
  });

  it.each([
    { pressed: 'Save Ingredient', other: 'Save & Add Another' },
    { pressed: 'Save & Add Another', other: 'Save Ingredient' },
  ])(
    'holds both saves down while one is in flight, $pressed busy and saying so',
    async ({ pressed, other }) => {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        graphqlLink.mutation<
          CreateWorkspaceIngredientMutation,
          CreateWorkspaceIngredientMutationVariables
        >('CreateWorkspaceIngredient', async ({ variables }) => {
          await held;
          return HttpResponse.json({
            data: { createWorkspaceIngredient: { id: 'saved-1', name: variables.input.name } },
          });
        }),
      );
      const onSaved = renderForm();
      const submit = screen.getByRole('button', { name: pressed });
      const rest = screen.getByRole('button', { name: other });

      type('Name', 'Testwort');
      submit.focus();
      fireEvent.click(submit);

      await waitFor(() => expect(submit).toBeDisabled());
      // Busy, and saying so, the owner's call during MB.131; the other is
      // held down beside it under its own name.
      expect(submit).toHaveAttribute('aria-busy', 'true');
      expect(submit).toHaveAccessibleName('Saving Ingredient');
      expect(rest).toBeDisabled();
      expect(rest).not.toHaveAttribute('aria-busy');
      expect(rest).toHaveAccessibleName(other);
      release();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      // Back up once answered; Save & Add Another has cleared the form, which
      // then has nothing to save, so both stay off until the next is entered.
      const cleared = pressed === 'Save & Add Another';
      expect(submit).toHaveProperty('disabled', cleared);
      expect(rest).toHaveProperty('disabled', cleared);
      expect(submit).not.toHaveAttribute('aria-busy');
      expect(submit).toHaveAccessibleName(pressed);
    },
  );
});
