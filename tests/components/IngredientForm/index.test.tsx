import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor as waitForDom,
  within,
} from '@testing-library/react';
import { HttpResponse } from 'msw';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import { MultiSelectField } from '@/components/IngredientForm/fields';
import type {
  IngredientElement,
  IngredientFormInput,
  IngredientFormValues,
} from '@/components/IngredientForm/types';
import { EMPTY_VALUES, ingredientResolver } from '@/components/IngredientForm/values';
import type {
  CreateWorkspaceIngredientMutation,
  CreateWorkspaceIngredientMutationVariables,
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
import {
  WORKSPACE_ID,
  offerDeities,
  offerDuplicates,
  offerForms,
  offerIngredients,
  offerList,
  offerNames,
  offerPlanets,
  offerSigns,
} from '../../support/msw/ingredient-lookups';
import { server } from '../../support/msw/server';
import type { CategoryNode, DuplicateNode } from './types';

// The ingredient entry form. The mutation is answered by MSW in the shape
// /api/graphql answers (tests/support/msw/graphql.ts), so a server error is
// the route's own mapping rather than a hand-written body
// (claude-docs/components/ingredient-form.md).

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

/**
 * RTL's waitFor, polled every 5 ms rather than its 50: most waits here are
 * for a mock to have been called — a save sent, a lookup asked — which no DOM
 * mutation announces, so each would otherwise cost a whole tick (MB.181).
 */
const waitFor: typeof waitForDom = (callback, options) =>
  waitForDom(callback, { interval: 5, ...options });

// The controls are found by their labels rather than by role and name: a
// role query names every element of the role in a 25-field form, and was most
// of this file's time (MB.181). The selector keeps each to its kind, and the
// required marker, hidden from the name, is dropped from the label's text.
const byLabel = (name: string, selector: string) =>
  screen.getByLabelText(name, {
    selector,
    normalizer: (text) => text.replace(/\*$/, '').trim(),
  });
const textbox = (name: string) => byLabel(name, 'input:not([role]), textarea');
/** A suggesting box: the form field, or a list's. A closed set's box is a combobox too, select-only. */
const box = (name: string) => byLabel(name, '[role="combobox"]');
const select = box;
const control = (name: string) => byLabel(name, 'input:not([role]), textarea, [role="combobox"]');
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
/**
 * A button among the form's saves, looked for there alone for the reason the
 * controls are found by label; a field's own harness, with no such row, is
 * searched whole.
 */
const saveButton = (name: string) => {
  const actions = document.querySelector<HTMLElement>('.ingredient-form__actions');
  return (actions ? within(actions) : screen).getByRole('button', { name });
};
/** Presses Save, focusing it first as a real click would: fireEvent moves no focus. */
const save = () => {
  const button = saveButton('Save Ingredient');
  button.focus();
  fireEvent.click(button);
};
/** Presses Save & Add Another, the secondary save, focusing it first as `save` does. */
const saveAnother = () => {
  const button = saveButton('Save & Add Another');
  button.focus();
  fireEvent.click(button);
};
/** Types an entry into a list's box and presses its Add button. */
const addEntry = (entry: string, value: string) => {
  type(entry, value);
  fireEvent.click(screen.getByLabelText(`Add ${entry}`, { selector: 'button' }));
};
const removeButton = (value: string) =>
  screen.getByLabelText(`Remove ${value}`, { selector: 'button' });

/** Answers `CreateWorkspaceIngredient` with a saved row, recording the variables it was sent. */
function acceptCreate() {
  const calls: CreateWorkspaceIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    CreateWorkspaceIngredientMutation,
    CreateWorkspaceIngredientMutationVariables
  >('CreateWorkspaceIngredient', (variables) => {
    calls.push(variables);
    return {
      createWorkspaceIngredient: { id: 'saved-1', name: variables.input.name, slug: 'saved' },
    };
  });
  return calls;
}

/** The control is flagged invalid and described, the error read with it. */
function expectErrorOn(control: HTMLElement) {
  expect(control).toBeInvalid();
  expect(control).toHaveAccessibleDescription(/\S/);
}

/** How many elements describe the control: a note or a status joins its hint. */
const describers = (control: HTMLElement) =>
  control.getAttribute('aria-describedby')?.split(' ').length ?? 0;

/** The status regions saying `text`: the form's own beside every box's. */
const statusesSaying = (text: string) =>
  screen.queryAllByRole('status').filter((status) => status.textContent?.includes(text));

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
/** Opens the picker's list and picks the category, once the categories have been read. */
const pickCategory = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
  fireEvent.click(await screen.findByRole('option', { name: new RegExp(`^${name}`) }));
};

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
        expect(onSaved).toHaveBeenCalledWith(
          { id: 'saved-1', name: 'Testwort', slug: 'saved' },
          'open',
        ),
      );
      expect(calls).toHaveLength(1);
      expect(calls[0].workspaceId).toBe(WORKSPACE_ID);
      // Sent as typed — the kind unanswered — and read by the schema the
      // service parses with as `none`, so the one-field stub is a whole entry.
      // No element chosen is sent as none, the answer "none" (MB.159).
      expect(calls[0].input).toMatchObject({
        name: 'Testwort',
        nomenclature: null,
        elements: [],
      });
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
        expect(onSaved).toHaveBeenCalledWith(
          { id: 'saved-1', name: 'Testwort', slug: 'saved' },
          'open',
        ),
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
      const onSaved = renderForm({ categories: CATEGORIES });

      type('Name', 'Testwort');
      choose('Classification', 'Botanical');
      type('Formal Name', 'Fixtura testalis');
      type('Form', 'dried leaf');
      type('Description', 'A fixture herb.');
      chooseEach('Element', 'Air');
      addEntry('Planet', 'Mercury');
      addEntry('Folk Name', 'Hedge Fixture');
      await pickCategory('Trialcraft');
      type('Safety Notes', 'None known.');
      saveAnother();

      await waitFor(() =>
        expect(onSaved).toHaveBeenCalledWith(
          { id: 'saved-1', name: 'Testwort', slug: 'saved' },
          'another',
        ),
      );
      await waitFor(() => expect(textbox('Name')).toHaveValue(''));
      expect(textbox('Name')).toHaveFocus();
      expect(select('Classification')).not.toHaveTextContent('Botanical');
      expect(textbox('Formal Name')).toHaveValue('');
      expect(textbox('Formal Name')).toBeEnabled();
      expect(box('Form')).toHaveValue('');
      expect(textbox('Description')).toHaveValue('');
      expect(screen.queryByRole('button', { name: 'Remove Air' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove Mercury' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Remove Hedge Fixture' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove Trialcraft' })).not.toBeInTheDocument();
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
      await waitFor(() => expect(statusesSaying('Testwort')).toHaveLength(1));
      expect(statusesSaying('Testwort')[0].closest('form')).not.toBeNull();
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));

      // A save refused by the resolver is a new answer, and the old one goes:
      // something entered, since a cleared form offers no save, but no name.
      type('Description', 'An entry with no name.');
      save();
      await waitFor(() => expect(statusesSaying('Testwort')).toHaveLength(0));
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
    it('appears beside its field, focused and announced, before any request is sent', async () => {
      const calls = acceptCreate();
      renderForm();

      type('Description', 'An entry with no name.');
      save();

      const name = textbox('Name');
      await waitFor(() => expectErrorOn(name));
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
      await waitFor(() => expectErrorOn(formal));
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

      await waitFor(() => expectErrorOn(box('Form')));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

      await waitFor(() => expectErrorOn(box('Folk Name')));
      expect(box('Folk Name')).toHaveFocus();
      expect(removeButton('Hedge Fixture')).toHaveAccessibleDescription(/\S/);
      expect(removeButton('Fixture Bane')).not.toHaveAccessibleDescription();
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
      await waitFor(() => expectErrorOn(element));
      expect(element).toHaveFocus();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

      expect(await screen.findByRole('alert')).toBeVisible();
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

      expect(await screen.findByRole('alert')).toBeVisible();
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

  // What the form does with the picker (MB.126): the picks sent, and an
  // issue routed to one. The picker's own list, picks, status and error
  // marking are CategoryPicker's (tests/components/CategoryPicker/).
  describe('the categories', () => {
    const [testward, , trialcraft] = CATEGORIES;

    it('sends the picked categories as categoryIds, by id, in the order picked', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm({ categories: CATEGORIES });

      type('Name', 'Testwort');
      await pickCategory('Trialcraft');
      await pickCategory('Testward');
      expect(removeButton('Trialcraft')).toBeInTheDocument();
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input.categoryIds).toEqual([trialcraft.id, testward.id]);
    });

    it('is something to save on its own', async () => {
      renderForm({ categories: CATEGORIES });

      await pickCategory('Trialcraft');

      expect(screen.getByRole('button', { name: 'Save Ingredient' })).toBeEnabled();
    });

    it('lands an issue on one pick on the picker’s error element, naming the pick, until it is taken out', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['categoryIds', 1], message: 'No such category' }],
      });
      renderForm({ categories: CATEGORIES });

      type('Name', 'Testwort');
      await pickCategory('Testward');
      await pickCategory('Fixture Shield');
      save();

      // The error names the pick, and its x reads it; the other pick's does not.
      await waitFor(() => expectErrorOn(box('Category')));
      expect(box('Category')).toHaveFocus();
      expect(box('Category')).toHaveAccessibleDescription(
        expect.stringContaining('Fixture Shield'),
      );
      expect(removeButton('Fixture Shield')).toHaveAccessibleDescription(
        expect.stringContaining('Fixture Shield'),
      );
      expect(removeButton('Testward')).not.toHaveAccessibleDescription(
        expect.stringContaining('Fixture Shield'),
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      fireEvent.click(removeButton('Fixture Shield'));
      await waitFor(() => expect(box('Category')).not.toBeInvalid());
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

      expect(await screen.findByRole('alert')).toBeVisible();
    });

    // The picker says so beneath its box (CategoryPicker's test); the form
    // goes on without them.
    it('still saves, with no categories, when they cannot be read', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm({ categories: 'refused' });
      const quiet = describers(box('Category'));

      // The picker's status joins the box's description once the read is refused.
      await waitFor(() => expect(describers(box('Category'))).toBeGreaterThan(quiet));
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

      await waitFor(() => expectErrorOn(textbox('Formal Name')));
      expect(calls).toHaveLength(0);
    });

    // The schema refuses a formal name on none; the form never lets one be
    // sent, so that refusal is the service's alone.
    it('shuts the formal name under None, emptying it and saying why', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();
      const quiet = describers(textbox('Formal Name'));

      type('Name', 'Testwort');
      type('Formal Name', 'Fixtura testalis');
      choose('Classification', 'None');

      const formal = textbox('Formal Name');
      expect(formal).toBeDisabled();
      expect(formal).toHaveValue('');
      // Its note joins its description.
      expect(describers(formal)).toBeGreaterThan(quiet);
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input).toMatchObject({ nomenclature: 'none', canonicalName: '' });
    });

    // An unknown entry takes either (MB.161), so a name typed before the kind
    // is settled is kept, and nothing is asked of the field.
    it('keeps the formal name open and optional under Unknown, saving what was typed', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();
      const quiet = describers(textbox('Formal Name'));

      type('Name', 'Testwort');
      type('Formal Name', 'Fixtura testalis');
      choose('Classification', 'Unknown');

      const formal = textbox('Formal Name');
      expect(formal).toBeEnabled();
      expect(formal).toHaveValue('Fixtura testalis');
      expect(formal).not.toBeRequired();
      expect(describers(formal)).toBe(quiet);
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input).toMatchObject({
        nomenclature: 'unknown',
        canonicalName: 'Fixtura testalis',
      });
    });

    it('opens the formal name again for a named kind', () => {
      renderForm();
      const quiet = describers(textbox('Formal Name'));

      choose('Classification', 'None');
      expect(textbox('Formal Name')).toBeDisabled();
      choose('Classification', 'Mineral');

      expect(textbox('Formal Name')).toBeEnabled();
      expect(describers(textbox('Formal Name'))).toBe(quiet);
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
    it('clears the formal-name error when the kind changes to Unknown, leaving it open, or to None', async () => {
      acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      choose('Classification', 'Botanical');
      save();
      await waitFor(() => expect(textbox('Formal Name')).toBeInvalid());
      choose('Classification', 'Unknown');

      await waitFor(() => expect(textbox('Formal Name')).not.toBeInvalid());
      expect(textbox('Formal Name')).toBeEnabled();

      choose('Classification', 'Botanical');
      save();
      await waitFor(() => expect(textbox('Formal Name')).toBeInvalid());
      choose('Classification', 'None');

      await waitFor(() => expect(textbox('Formal Name')).not.toBeInvalid());
      expect(textbox('Formal Name')).toBeDisabled();
    });
  });

  describe('the closed and open fields', () => {
    it('marks only the name required at first', () => {
      renderForm();

      expect(textbox('Name')).toBeRequired();
      expect(textbox('Formal Name')).not.toBeRequired();
      expect(select('Classification')).not.toBeRequired();

      // The formal name while a named classification is chosen, and not
      // under Unknown or None.
      choose('Classification', 'Mineral');
      expect(textbox('Formal Name')).toBeRequired();
      choose('Classification', 'Unknown');
      expect(textbox('Formal Name')).not.toBeRequired();
      choose('Classification', 'None');
      expect(textbox('Formal Name')).not.toBeRequired();

      // A formal name with no kind saves as unknown (MB.161), so it asks for none.
      choose('Classification', 'Unknown');
      type('Formal Name', 'Fixtura testalis');
      expect(select('Classification')).not.toBeRequired();
    });

    it('takes form as free text rather than a fixed choice', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      type('Form', 'moon-dried shavings');
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input.form).toBe('moon-dried shavings');
    });
  });

  // Story 16's warning, as only the whole form holds it: the form asks its
  // `check` before it sends and moves the focus to Create Anyway. What the
  // warning says and when it asks is duplicates.test.tsx's.
  describe('the duplicate warning', () => {
    const TOMENTOSA: DuplicateNode = {
      id: 'claw-1',
      name: "Cat's Claw",
      canonicalName: 'Uncaria tomentosa',
      slug: 'cats-claw-uncaria-tomentosa',
    };

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    const warning = () => screen.getByRole('status', { name: 'Possible duplicates' });
    const createAnyway = () => screen.queryByRole('button', { name: 'Create Anyway' });

    it('holds a save on a near match to this coven’s name as sent, the focus on Create Anyway, which lets the next save go', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerDuplicates([TOMENTOSA]);

      type('Name', "Cat's Claw ");
      save();

      await waitFor(() => expect(createAnyway()).toHaveFocus());
      expect(calls).toEqual([{ workspaceId: WORKSPACE_ID, name: "Cat's Claw", first: 3 }]);
      expect(textbox('Name')).toBeInvalid();
      expect(saves).toHaveLength(0);
      // Again, and the focus goes back to it.
      save();
      await waitFor(() => expect(createAnyway()).toHaveFocus());
      expect(saves).toHaveLength(0);

      fireEvent.click(createAnyway() as HTMLElement);
      expect(warning()).toBeEmptyDOMElement();
      expect(textbox('Name')).toHaveFocus();
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves).toHaveLength(1);
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

    it('lets an error elsewhere take the save first', async () => {
      const saves = acceptCreate();
      renderForm();
      offerDuplicates([TOMENTOSA]);

      type('Name', "Cat's Claw");
      choose('Classification', 'Botanical');
      act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
      await within(warning()).findByRole('link');
      save();

      await waitFor(() => expect(textbox('Formal Name')).toHaveFocus());
      expect(createAnyway()).not.toHaveFocus();
      expect(saves).toHaveLength(0);
    });
  });

  // The form's half of each lookup, once per kind: the box asks with this
  // coven, and the pick is sent. What a lookup offers and how a pick reads is
  // lookups.test.tsx's.
  describe('the lookups wired', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    /** Focuses the box, which starts its lookup, and picks `option` from its list once it answers. */
    const pickFrom = async (name: string, calls: unknown[], option: RegExp) => {
      act(() => box(name).focus());
      await waitFor(() => expect(calls).toHaveLength(1));
      fireEvent.click(screen.getByRole('button', { name: `Show ${name} suggestions` }));
      fireEvent.click(await screen.findByRole('option', { name: option }));
    };

    it('asks the form box about this coven, sends its pick by id, and clears it with the rest after Save & Add Another', async () => {
      const SUBSTANCE_WAX_ID = '6e1f2a3b-4c5d-4e7f-8a9b-0c1d2e3f4a5b';
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerForms([
        {
          id: SUBSTANCE_WAX_ID,
          value: 'Wax',
          description: null,
          group: 'Substance',
          curated: true,
          claimants: [],
        },
      ]);

      await pickFrom('Form', calls, /^Wax \(Substance\)/);
      expect(calls[0]).toEqual({ workspaceId: WORKSPACE_ID, query: '', first: 10 });
      type('Name', 'Testwort');
      saveAnother();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input).toMatchObject({ form: 'Wax', formId: SUBSTANCE_WAX_ID });
      await waitFor(() => expect(box('Form')).toHaveValue(''));
      expect(box('Form')).not.toHaveAccessibleDescription(expect.stringContaining('Substance'));
    });

    it('asks each list box’s own lookup about this coven, and sends each pick in its shape', async () => {
      const GREEK_HECATE_ID = '4b2a6c8e-1d3f-4a5b-9c7d-8e0f1a2b3c4d';
      const COVEN_ID = '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d';
      const saves = acceptCreate();
      const onSaved = renderForm();
      const lookups = [
        {
          entry: 'Folk Name',
          calls: offerNames([{ value: 'Hedge Fixture', claimants: [] }]),
          option: /^Hedge Fixture/,
        },
        {
          entry: 'Planet',
          calls: offerPlanets([{ value: 'Moon', description: null, curated: true }]),
          option: /^Moon/,
        },
        {
          entry: 'Zodiac Sign',
          calls: offerSigns([{ value: 'Cancer', description: null, curated: true }]),
          option: /^Cancer/,
        },
        {
          entry: 'Deity',
          calls: offerDeities([
            {
              id: GREEK_HECATE_ID,
              value: 'Hecate',
              description: null,
              tradition: 'Greek',
              curated: true,
            },
          ]),
          option: /^Hecate \(Greek\)/,
        },
        {
          entry: 'Substitute Ingredient',
          calls: offerIngredients([
            {
              id: COVEN_ID,
              name: 'Mockwort',
              canonicalName: null,
              form: null,
              description: null,
              isGlobal: false,
            },
          ]),
          option: /^Mockwort/,
        },
      ];

      // None asks until its box is used.
      act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
      for (const { calls } of lookups) expect(calls).toHaveLength(0);
      for (const { entry, calls, option } of lookups) {
        await pickFrom(entry, calls, option);
        expect(calls[0]).toEqual({ workspaceId: WORKSPACE_ID, query: '', first: 10 });
      }
      type('Name', 'Testwort');
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input).toMatchObject({
        folkNames: ['Hedge Fixture'],
        planets: ['Moon'],
        zodiacSigns: ['Cancer'],
        deities: [{ deityId: GREEK_HECATE_ID }],
        substitutes: [{ ingredientId: COVEN_ID }],
      });
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
      expect(screen.getAllByRole('option')).toHaveLength(3);
      expect(screen.queryByRole('option', { name: 'Water' })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Earth' })).not.toBeInTheDocument();
    });

    it('shows a repeat the schema refuses on the Element control', async () => {
      const onSubmit = renderElements(['fire', 'fire']);

      save();

      await waitFor(() => expectErrorOn(select('Element')));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it.each([{ pressed: 'Save Ingredient', other: 'Save & Add Another' }])(
    'holds both saves down while one is in flight, $pressed busy',
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
            data: {
              createWorkspaceIngredient: {
                id: 'saved-1',
                name: variables.input.name,
                slug: 'saved',
              },
            },
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
      // Busy, the owner's call during MB.131; the other is held down beside it.
      expect(submit).toHaveAttribute('aria-busy', 'true');
      expect(rest).toBeDisabled();
      expect(rest).not.toHaveAttribute('aria-busy');
      release();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      // Back up once answered.
      expect(submit).toBeEnabled();
      expect(rest).toBeEnabled();
      expect(submit).not.toHaveAttribute('aria-busy');
    },
  );
});
