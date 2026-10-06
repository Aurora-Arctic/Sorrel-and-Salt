import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import { ListField } from '@/components/IngredientForm/fields';
import type {
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
import type {
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

/** Renders the form with every lookup answered empty; a test about a lookup answers it after rendering, since the later answer wins. */
function renderForm() {
  const onSaved = vi.fn();
  offerForms([]);
  offerNames([]);
  offerPlanets([]);
  offerSigns([]);
  offerDeities([]);
  offerIngredients([]);
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

describe('IngredientForm', () => {
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
      choose('Element', 'Air');
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
        element: 'air',
        planets: ['Mercury', 'Venus'],
        zodiacSigns: ['Gemini'],
        colors: ['Silver-green'],
        safetyNotes: 'None known.',
        deities: [],
        substitutes: [],
        folkNames: [],
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
      choose('Element', 'Air');
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
      expect(select('Element')).toHaveTextContent('None');
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

      // A save refused by the resolver is a new answer, and the old one goes.
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
    it('appears beside its field, focused and announced, before any request is sent', async () => {
      const calls = acceptCreate();
      renderForm();

      save();

      const name = textbox('Name');
      await waitFor(() => expectErrorOn(name, 'Give the ingredient a name'));
      expect(name).toHaveFocus();
      expect(calls).toHaveLength(0);
    });

    it('clears once the field is corrected', async () => {
      acceptCreate();
      renderForm();

      save();
      await waitFor(() => expect(textbox('Name')).toBeInvalid());
      type('Name', 'Testwort');

      await waitFor(() => expect(textbox('Name')).not.toBeInvalid());
      expect(screen.queryByText('Give the ingredient a name')).not.toBeInTheDocument();
    });

    it('lands on the list entry it names, focusing the list', async () => {
      const calls = acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      addEntry('Folk Name', 'Hedge Fixture');
      addEntry('Folk Name', 'hedge fixture');
      save();

      const folkName = box('Folk Name');
      await waitFor(() => expectErrorOn(folkName, 'This folk name is already listed'));
      expect(folkName).toHaveFocus();
      // The entry itself says why, and its twin says nothing.
      expect(removeButton('hedge fixture')).toHaveAccessibleDescription(
        expect.stringContaining('This folk name is already listed'),
      );
      expect(removeButton('Hedge Fixture')).not.toHaveAccessibleDescription(
        expect.stringContaining('This folk name is already listed'),
      );
      expect(calls).toHaveLength(0);
    });

    it('clears from a list once the entry it names is removed', async () => {
      acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      addEntry('Folk Name', 'Hedge Fixture');
      addEntry('Folk Name', 'hedge fixture');
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

    it('renders through the same element as a resolver error on that field', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'], message: 'This coven already has a Testwort' }],
      });
      renderForm();

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

    // The schema refuses a formal name on a nameless kind; the form never
    // lets one be sent, so that refusal is the service's alone.
    it('shuts the formal name for a nameless kind, emptying it and saying why', async () => {
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

    it('opens the formal name again for a named kind', () => {
      renderForm();

      choose('Classification', 'Unknown');
      expect(textbox('Formal Name')).toHaveAccessibleDescription(
        expect.stringContaining('An "unknown" entry records no formal name.'),
      );
      choose('Classification', 'Mineral');

      expect(textbox('Formal Name')).toBeEnabled();
      expect(textbox('Formal Name')).not.toHaveAccessibleDescription(
        expect.stringContaining('records no formal name'),
      );
    });

    it('asks which classification a formal name belongs to, beside the selector', async () => {
      acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      type('Formal Name', 'Fixtura testalis');
      save();

      await waitFor(() =>
        expectErrorOn(
          select('Classification'),
          'Choose the classification this formal name belongs to',
        ),
      );
    });

    // Inline: fixing either side clears the error on the other, with no second submit.
    it('clears the formal-name error when the kind changes to a nameless one', async () => {
      acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      choose('Classification', 'Botanical');
      save();
      await waitFor(() => expect(textbox('Formal Name')).toBeInvalid());
      choose('Classification', 'Unknown');

      await waitFor(() => expect(textbox('Formal Name')).not.toBeInvalid());
      expect(textbox('Formal Name')).toBeDisabled();
    });

    it('clears the classification error when the formal name is cleared', async () => {
      acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      type('Formal Name', 'Fixtura testalis');
      save();
      await waitFor(() => expect(select('Classification')).toBeInvalid());
      type('Formal Name', '');

      await waitFor(() => expect(select('Classification')).not.toBeInvalid());
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
    });

    it('marks the classification required while a formal name is typed', () => {
      renderForm();

      type('Formal Name', 'Fixtura testalis');
      expect(select('Classification')).toBeRequired();

      type('Formal Name', '   ');
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

    it('offers the five elements and None, the choice that clears it, unanswered by default', () => {
      renderForm();

      expect(select('Element')).toHaveTextContent('None');
      fireEvent.click(select('Element'));
      const list = screen.getByRole('listbox', { name: 'Element choices' });
      expect(
        within(list)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['None', 'Earth', 'Air', 'Fire', 'Water', 'Spirit']);
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
  describe.each([
    {
      legend: 'Folk Names',
      entry: 'Folk Name',
      field: 'folkNames',
      hint: 'Other names it goes by',
    },
    {
      legend: 'Planets',
      entry: 'Planet',
      field: 'planets',
      hint: 'The heavenly bodies it answers to',
    },
    {
      legend: 'Zodiac Signs',
      entry: 'Zodiac Sign',
      field: 'zodiacSigns',
      hint: 'The signs it answers to',
    },
    { legend: 'Colours', entry: 'Colour', field: 'colors', hint: 'not the colour it is' },
    { legend: 'Deities', entry: 'Deity', field: 'deities', hint: 'The gods and spirits' },
    {
      legend: 'Substitute Ingredients',
      entry: 'Substitute Ingredient',
      field: 'substitutes',
      hint: 'Other ingredients to use in its place',
    },
  ] as const)('the $legend list', ({ legend, entry, field, hint }) => {
    const group = () => screen.getByRole('group', { name: legend });
    // A typed substitute is sent as a name (DESIGN.md §5, `ingredient_substitutes`).
    const sent = (values: string[]) =>
      field === 'substitutes' ? values.map((name) => ({ name })) : values;
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
    const WAX_ANIMAL: FormNode = {
      value: 'Wax',
      description: null,
      group: 'Animal',
      curated: true,
      claimants: [{ name: 'Testwort', canonicalName: 'Fixtura testalis' }],
    };
    const WAX_SUBSTANCE: FormNode = {
      value: 'Wax',
      description: 'Candle and poppet wax.',
      group: 'Substance',
      curated: true,
      claimants: [],
    };
    const RHIZOMES: FormNode = {
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

    it('fills the field from a pick and links nothing', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerForms([WAX_ANIMAL, WAX_SUBSTANCE]);

      await use('Form', calls);
      type('Form', 'wax');
      settle();
      fireEvent.click(await screen.findByRole('option', { name: /^Wax \(Substance\)/ }));

      expect(box('Form')).toHaveValue('Wax');
      expect(box('Form')).toHaveAttribute('aria-expanded', 'false');
      type('Name', 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.form).toBe('Wax');
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
      expect(saves[0].input.form).toBe('rhizome');
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
    const HECATE_GREEK: DeityNode = {
      value: 'Hecate',
      description: 'Of crossroads and the moon.',
      tradition: 'Greek',
      curated: true,
    };
    const HECATE_ROMAN: DeityNode = {
      value: 'Hecate',
      description: null,
      tradition: 'Roman',
      curated: true,
    };
    const HECATE_FIXTURE: DeityNode = {
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
      isGlobal: true,
    };
    const MOCKWORT_COVEN: IngredientNode = {
      ...MOCKWORT_COMPENDIUM,
      id: COVEN_ID,
      isGlobal: false,
    };
    const MOCKWORT_TEA: IngredientNode = {
      id: BARE_ID,
      name: 'Mockwort Tea',
      canonicalName: null,
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
        // The value, never the label: "Hecate", not "Hecate (Greek)".
        option: /^Hecate \(Greek\)/,
        value: 'Hecate',
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
      expect(removeButton('Hecate')).toBeInTheDocument();

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
      expect(saves[0].input.deities).toEqual(['Hecate', 'Fixture of the Hedge']);
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
      expect(removeButton('Mockwort (Fixtura vulgaris)')).toBeInTheDocument();
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

  // MB.140: a substitute links an ingredient or names one. The lookup above
  // picks a link; here the list is given one, to show and send it alone.
  describe('a linked substitute', () => {
    const LINKED_ID = '3f6c1d2e-8a4b-4c5d-9e0f-1a2b3c4d5e6f';
    const linked: SubstituteListEntry = {
      value: 'Mockleaf',
      link: { id: LINKED_ID, canonicalName: 'Fixtura testalis' },
    };

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
      renderList([{ value: 'Mockleaf', link: { id: LINKED_ID, canonicalName: null } }]);

      expect(removeButton('Mockleaf')).toBeInTheDocument();
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
      expect(submit).toBeEnabled();
      expect(rest).toBeEnabled();
      expect(submit).not.toHaveAttribute('aria-busy');
      expect(submit).toHaveAccessibleName(pressed);
    },
  );
});
