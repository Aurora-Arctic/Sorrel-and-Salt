import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import type {
  CreateWorkspaceIngredientMutation,
  CreateWorkspaceIngredientMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// The ingredient entry form. The mutation is answered by MSW in the shape
// /api/graphql answers (tests/support/msw/graphql.ts), so a server error is
// the route's own mapping rather than a hand-written body
// (claude-docs/components/ingredient-form.md).

const WORKSPACE_ID = '7b0c1c3e-5f4a-4d8e-9a51-3c2f0e6d9b17';

function renderForm() {
  const onSaved = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <IngredientForm workspaceId={WORKSPACE_ID} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return onSaved;
}

const textbox = (name: string) => screen.getByRole('textbox', { name });
const select = (name: string) => screen.getByRole('combobox', { name });
const type = (name: string, value: string) =>
  fireEvent.change(textbox(name), { target: { value } });
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
      type('Planet', 'Mercury');
      type('Zodiac Sign', 'Gemini');
      type('Colour', 'Silver-green');
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
        planet: 'Mercury',
        zodiac: 'Gemini',
        color: 'Silver-green',
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

      const box = textbox('Folk Name');
      await waitFor(() => expectErrorOn(box, 'This folk name is already listed'));
      expect(box).toHaveFocus();
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
      await waitFor(() => expect(textbox('Folk Name')).toBeInvalid());
      fireEvent.click(removeButton('hedge fixture'));

      await waitFor(() => expect(textbox('Folk Name')).not.toBeInvalid());
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
        expectErrorOn(textbox('Folk Name'), 'Another entry here claims Hedge Fixture'),
      );
      expect(textbox('Folk Name')).toHaveFocus();
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

    it("shows a field's hint while the field has focus", () => {
      renderForm();

      act(() => select('Classification').focus());
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        'Botanical for a plant, mineral for a stone',
      );

      act(() => textbox('Folk Name').focus());
      expect(screen.getByRole('tooltip')).toHaveTextContent('Other names it goes by');
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

      const form = textbox('Form');
      expect(form.tagName).toBe('INPUT');
      type('Name', 'Testwort');
      type('Form', 'moon-dried shavings');
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input.form).toBe('moon-dried shavings');
    });
  });

  describe.each([
    { legend: 'Folk Names', entry: 'Folk Name', field: 'folkNames' },
    { legend: 'Deities', entry: 'Deity', field: 'deities' },
    {
      legend: 'Substitute Ingredients',
      entry: 'Substitute Ingredient',
      field: 'substitutes',
    },
  ] as const)('the $legend list', ({ legend, entry, field }) => {
    const group = () => screen.getByRole('group', { name: legend });
    const entries = () =>
      within(group())
        .queryAllByRole('button', { name: /^Remove / })
        .map((button) => button.getAttribute('aria-label'));

    it('starts with one empty box and no entries', () => {
      renderForm();

      expect(within(group()).getAllByRole('textbox')).toHaveLength(1);
      expect(textbox(entry)).toHaveValue('');
      expect(within(group()).queryByRole('list')).not.toBeInTheDocument();
    });

    it('adds what is typed as an entry above the box, clearing and keeping the box focused', () => {
      renderForm();

      addEntry(entry, '  First Fixture ');

      expect(within(group()).getByRole('list')).toBeInTheDocument();
      expect(entries()).toEqual(['Remove First Fixture']);
      expect(textbox(entry)).toHaveValue('');
      expect(textbox(entry)).toHaveFocus();
    });

    it('adds on Enter without saving the form', () => {
      const calls = acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      type(entry, 'First Fixture');
      fireEvent.keyDown(textbox(entry), { key: 'Enter' });

      expect(entries()).toEqual(['Remove First Fixture']);
      expect(calls).toHaveLength(0);
    });

    it('announces each entry added and removed, politely', () => {
      renderForm();

      addEntry(entry, 'First Fixture');
      const status = within(group()).getByRole('status');
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
      expect(textbox(entry)).toHaveFocus();
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
      expect(calls[0].input[field]).toEqual(['First Fixture', 'Third Fixture']);
    });

    it('refuses to save with text left in the box, until it is added', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      addEntry(entry, 'First Fixture');
      type(entry, 'Second Fixture');
      save();

      const box = textbox(entry);
      await waitFor(() =>
        expectErrorOn(box, 'Press Add to keep "Second Fixture", or clear the box'),
      );
      expect(box).toHaveFocus();
      expect(calls).toHaveLength(0);

      fireEvent.click(screen.getByRole('button', { name: `Add ${entry}` }));
      await waitFor(() => expect(box).not.toBeInvalid());
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input[field]).toEqual(['First Fixture', 'Second Fixture']);
    });

    it('lets the save through once text left in the box is cleared', async () => {
      const calls = acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      type(entry, 'Stray Fixture');
      save();
      await waitFor(() => expect(textbox(entry)).toBeInvalid());
      type(entry, '');

      await waitFor(() => expect(textbox(entry)).not.toBeInvalid());
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input[field]).toEqual([]);
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
