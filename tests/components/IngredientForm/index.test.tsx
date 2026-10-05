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
import type { FormNode, NameNode } from './types';

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

/** Renders the form with both lookups answered empty; a test about a lookup answers it after rendering, since the later answer wins. */
function renderForm() {
  const onSaved = vi.fn();
  offerForms([]);
  offerNames([]);
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <IngredientForm workspaceId={WORKSPACE_ID} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return onSaved;
}

const textbox = (name: string) => screen.getByRole('textbox', { name });
/** A suggesting box: the form field, or a list's. A native select is a combobox too, under its own name. */
const box = (name: string) => screen.getByRole('combobox', { name });
const select = box;
const control = (name: string) =>
  screen.queryByRole('textbox', { name }) ?? screen.getByRole('combobox', { name });
const type = (name: string, value: string) =>
  fireEvent.change(control(name), { target: { value } });
const choose = (name: string, value: string) =>
  fireEvent.change(select(name), { target: { value } });
/** Presses Save, focusing it first as a real click would: fireEvent moves no focus. */
const save = () => {
  const button = screen.getByRole('button', { name: 'Save Ingredient' });
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
        expect(onSaved).toHaveBeenCalledWith({ id: 'saved-1', name: 'Testwort' }),
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
      choose('Classification', 'botanical');
      type('Formal Name', 'Fixtura testalis');
      type('Form', 'dried leaf');
      type('Description', 'A fixture herb.');
      choose('Element', 'air');
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
      choose('Classification', 'botanical');
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
      choose('Classification', 'botanical');
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
      choose('Classification', 'none');

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

      choose('Classification', 'unknown');
      expect(textbox('Formal Name')).toHaveAccessibleDescription(
        expect.stringContaining('An "unknown" entry records no formal name.'),
      );
      choose('Classification', 'mineral');

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
      choose('Classification', 'botanical');
      save();
      await waitFor(() => expect(textbox('Formal Name')).toBeInvalid());
      choose('Classification', 'unknown');

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

      // The placeholder is hidden from the list, so only the kinds are offered.
      const options = within(select('Classification')).getAllByRole('option');
      expect(options.map((option) => option.getAttribute('value'))).toEqual([
        'botanical',
        'fungal',
        'zoological',
        'mineral',
        'chemical',
        'unknown',
        'none',
      ]);
      expect(select('Classification')).toHaveValue('');
      expect(select('Classification')).toHaveDisplayValue('Choose a classification');
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

      choose('Classification', 'mineral');
      expect(textbox('Formal Name')).toBeRequired();

      choose('Classification', 'unknown');
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

    it('offers the five elements from a native select, unanswered by default', () => {
      renderForm();

      const element = select('Element');
      expect(element.tagName).toBe('SELECT');
      expect(
        within(element)
          .getAllByRole('option')
          .map((o) => o.getAttribute('value')),
      ).toEqual(['', 'earth', 'air', 'fire', 'water', 'spirit']);
      expect(element).toHaveValue('');
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

    // M5.10a: one entry box, the combobox, on every list; only the folk names
    // have a source yet (MB.131 gives the others theirs).
    it(`is the combobox, ${field === 'folkNames' ? 'with' : 'without'} a list to open`, () => {
      renderForm();

      expect(box(entry)).toHaveAttribute('aria-autocomplete', 'list');
      expect(box(entry).closest('.combobox__control')).toContainElement(box(entry));
      const chevron = screen.queryByRole('button', { name: `Show ${entry} suggestions` });
      if (field === 'folkNames') expect(chevron).toBeInTheDocument();
      else expect(chevron).not.toBeInTheDocument();
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

      const curated = await screen.findByRole('group', { name: 'Curated' });
      // Two same-named forms, told apart by the group in each one's name.
      expect(within(curated).getByRole('option', { name: /^Wax \(Animal\)/ })).toHaveTextContent(
        'Used by Testwort (Fixtura testalis)',
      );
      expect(within(curated).getByRole('option', { name: /^Wax \(Substance\)/ })).toHaveTextContent(
        'Candle and poppet wax.',
      );
      const inUse = screen.getByRole('group', { name: 'In use' });
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
      expect(screen.queryByRole('group', { name: 'Curated' })).not.toBeInTheDocument();
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

  // MB.140: a substitute links an ingredient or names one. Nothing in the
  // form picks a link until MB.131's lookup, so the list is given one here.
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

  it('holds the submit down while a save is in flight', async () => {
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
    const submit = screen.getByRole('button', { name: 'Save Ingredient' });

    type('Name', 'Testwort');
    save();

    await waitFor(() => expect(submit).toBeDisabled());
    release();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(submit).toBeEnabled();
  });
});
