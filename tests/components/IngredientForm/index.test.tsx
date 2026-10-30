import { act, fireEvent, screen, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import type {
  AddCupboardEntryFromFormMutation,
  AddCupboardEntryFromFormMutationVariables,
  CreateWorkspaceIngredientMutation,
  CreateWorkspaceIngredientMutationVariables,
  PossibleDuplicatesQuery,
  PossibleDuplicatesQueryVariables,
} from '@/gql/graphql';
import { ADDED_HOLD_MS } from '@/components/AddIcon';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { ValidationError } from '@/lib/errors';
import { maskError } from '@/graphql/errors';
import { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import {
  box,
  chooseKind,
  inPanel,
  renderWithClient,
  textbox,
  waitFor,
  duplicateHref,
} from '../../support/ingredient-form';
import { layOutChips, moveByKeyboard } from '../../support/sortable';
import { choose, press, redo, type, typeIn, undo } from '../../support/interact';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import {
  WORKSPACE_ID,
  acceptCreate,
  offerCategories,
  offerCompendiumMatches,
  offerDeities,
  offerDuplicates,
  offerForms,
  offerIngredients,
  offerNames,
  offerNothing,
  offerCelestialBodies,
  offerSigns,
} from '../../support/msw/ingredient-lookups';
import { server } from '../../support/msw/server';
import type { CategoryNode, DuplicateNode } from './types';

// The ingredient entry form. MSW answers the mutation in the shape /api/graphql answers (tests/support/msw/graphql.ts), so a server error is the route's own mapping rather than a hand-written body
// (claude-docs/components/ingredient-form.md).

/** Renders the form with every lookup answered empty; a test about a lookup answers it after rendering, since the later answer wins. The categories are read as the form opens, so a test about them passes them in. */
function renderForm({ categories = [] }: { categories?: CategoryNode[] | 'refused' } = {}) {
  const onSaved = vi.fn();
  offerNothing();
  offerCategories(categories);
  renderWithClient(
    <IngredientForm duplicateHref={duplicateHref} workspaceId={WORKSPACE_ID} onSaved={onSaved} />,
  );
  return onSaved;
}

/** A closed set's box: a combobox too, select-only. */
const select = box;
/** Opens a multi-select's box, picks each choice in turn, and closes it: it stays open between picks. */
const chooseEach = (name: string, ...labels: string[]) => {
  fireEvent.click(select(name));
  const list = screen.getByRole('listbox', { name: `${name} choices` });
  for (const label of labels) fireEvent.click(within(list).getByRole('option', { name: label }));
  fireEvent.keyDown(select(name), { key: 'Escape' });
};
/** Presses Save, focusing it first as a real click would: fireEvent moves no focus. */
const save = () => press('Save Ingredient');
/** Presses Save & Add Another, the secondary save, focusing it first as `save` does. */
const saveAnother = () => press('Save & Add Another');
/** Types an entry into a list's box and presses its Add button. */
const addEntry = (entry: string, value: string) => {
  type(entry, value);
  fireEvent.click(screen.getByLabelText(`Add ${entry}`, { selector: 'button' }));
};
const removeButton = (value: string) =>
  screen.getByLabelText(`Remove ${value}`, { selector: 'button' });

/** Lets the step a change opened close, as the gap between two real actions does. */
const settle = () => act(async () => {});

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

// Invented groups, given out of order: the picker sorts them, and
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
  // Opened only when shut: a pick leaves the list open for the next, and the
  // chevron would shut it.
  if (screen.getByRole('combobox', { name: 'Category' }).getAttribute('aria-expanded') !== 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
  // A longer wait than the default 1000ms, here alone: nothing says the categories have loaded before the list opens, so the options are the only signal.
  // They appear about 82ms after the click on an idle machine, but a run under full CPU load slows this file's tests up to about 85 times, past 1000ms; 10s covers that and stays inside the 20s test timeout.
  fireEvent.click(
    await screen.findByRole('option', { name: new RegExp(`^${name}`) }, { timeout: 10_000 }),
  );
};

describe('IngredientForm', () => {
  // The owner's rule for every form: a save is offered only when there
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
          { id: 'saved-1', name: 'Testwort', slug: 'saved', revision: 1, stock: [] },
          'open',
        ),
      );
      expect(calls).toHaveLength(1);
      expect(calls[0].workspaceId).toBe(WORKSPACE_ID);
      // Sent as typed — the kind unanswered — and read by the schema the
      // service parses with as `none`, so the one-field stub is a whole entry.
      // No element chosen is sent as none, the answer "none".
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
      type('Description', 'A fixture herb.');
      chooseEach('Element', 'Water', 'Air');
      addEntry('Celestial Body', 'Mercury');
      addEntry('Celestial Body', 'Venus');
      addEntry('Zodiac Sign', 'Gemini');
      addEntry('Colour', 'Silver-green');
      type('Safety Notes', 'None known.');
      fireEvent.click(screen.getByRole('switch', { name: 'Toxic' }));
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(calls[0].input).toEqual({
        name: 'Testwort',
        nomenclature: 'botanical',
        canonicalName: 'Fixtura testalis',
        description: 'A fixture herb.',
        // In the order chosen, not the vocabulary's.
        elements: ['water', 'air'],
        celestialBodies: ['Mercury', 'Venus'],
        zodiacSigns: ['Gemini'],
        colors: ['Silver-green'],
        safetyNotes: 'None known.',
        toxic: true,
        deities: [],
        substitutes: [],
        folkNames: [],
        // None picked is sent as none, which an update needs to clear them.
        categoryIds: [],
        references: [],
        // Its forms alone, never a top-level form: variants-field.test.tsx's.
        variants: [],
      });
    });

    // Save Ingredient opens what it made,
    // and Save & Add Another leaves the form ready for the next ingredient.
    it('asks the page to open what Save Ingredient made, leaving the form as it is', async () => {
      acceptCreate();
      const onSaved = renderForm();

      type('Name', 'Testwort');
      addEntry('Celestial Body', 'Mercury');
      save();

      await waitFor(() =>
        expect(onSaved).toHaveBeenCalledWith(
          { id: 'saved-1', name: 'Testwort', slug: 'saved', revision: 1, stock: [] },
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
      // A submit with no button pressed, as implicit submission from a field is in happy-dom.
      fireEvent.submit(textbox('Name').closest('form') as HTMLFormElement);

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.anything(), 'open'));
    });

    it('clears every field and list once saved by Save & Add Another, and puts the focus in Name', async () => {
      acceptCreate();
      const onSaved = renderForm({ categories: CATEGORIES });

      type('Name', 'Testwort');
      choose('Classification', 'Botanical');
      type('Formal Name', 'Fixtura testalis');
      type('Description', 'A fixture herb.');
      chooseEach('Element', 'Air');
      addEntry('Celestial Body', 'Mercury');
      addEntry('Folk Name', 'Hedge Fixture');
      await pickCategory('Trialcraft');
      type('Safety Notes', 'None known.');
      saveAnother();

      await waitFor(() =>
        expect(onSaved).toHaveBeenCalledWith(
          { id: 'saved-1', name: 'Testwort', slug: 'saved', revision: 1, stock: [] },
          'another',
        ),
      );
      await waitFor(() => expect(textbox('Name')).toHaveValue(''));
      expect(textbox('Name')).toHaveFocus();
      expect(select('Classification')).not.toHaveTextContent('Botanical');
      expect(textbox('Formal Name')).toHaveValue('');
      expect(textbox('Formal Name')).toBeEnabled();
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

    // Errors show on leaving a field, not only on submit.
    describe('on leaving a field', () => {
      // A field's error waits for it to be left after the person has edited it,
      // even if the edit put it back to its default.
      it('flags an edited value that is invalid once the field is left, before any submit', async () => {
        const calls = acceptCreate();
        renderForm();

        type('Name', '   ');
        fireEvent.blur(textbox('Name'));

        await waitFor(() => expectErrorOn(textbox('Name')));
        expect(calls).toHaveLength(0);
      });

      it('flags a required field typed into, emptied and left, before any submit', async () => {
        renderForm();

        fireEvent.focus(textbox('Name'));
        type('Name', 'Testwort');
        type('Name', '');
        fireEvent.blur(textbox('Name'));

        await waitFor(() => expectErrorOn(textbox('Name')));
      });

      it('leaves a required field quiet when it, or another field, is left without an edit', async () => {
        renderForm();

        fireEvent.focus(textbox('Name'));
        fireEvent.blur(textbox('Name'));
        fireEvent.focus(textbox('Description'));
        fireEvent.blur(textbox('Description'));
        await settle();

        expect(textbox('Name')).not.toBeInvalid();
      });

      it('flags the formal name once it is left, after the classification asked for one', async () => {
        renderForm();

        type('Name', 'Testwort');
        choose('Classification', 'Botanical');
        fireEvent.blur(select('Classification'));
        await settle();
        expect(textbox('Formal Name')).not.toBeInvalid();

        fireEvent.focus(textbox('Formal Name'));
        type('Formal Name', 'x');
        type('Formal Name', '');
        fireEvent.blur(textbox('Formal Name'));

        await waitFor(() => expectErrorOn(textbox('Formal Name')));
      });

      it('does not flag the formal name when only the classification changed', async () => {
        renderForm();

        type('Name', 'Testwort');
        choose('Classification', 'Botanical');
        // Leaving the picker is what lets its change revalidate Formal Name.
        fireEvent.blur(select('Classification'));
        await settle();

        expect(textbox('Formal Name')).not.toBeInvalid();
      });
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

    // An index past the category picks names none of them, as a slug names no field: the form
    // has no field for either, so it is said above the fields rather than lost.
    it.each([
      { path: ['slug'], message: 'That slug is already taken' },
      { path: ['categoryIds', 4], message: 'No such category' },
    ])(
      'renders above the fields when its path, $path, names no field the form has',
      async (issue) => {
        mockGraphQLError('CreateWorkspaceIngredient', { code: 'VALIDATION', fieldErrors: [issue] });
        renderForm({ categories: CATEGORIES });

        type('Name', 'Testwort');
        save();

        expect(await screen.findByRole('alert')).toBeVisible();
      },
    );

    it("shows a refusal's own message, keeping what was typed", async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'FORBIDDEN',
        message: 'Viewers cannot add ingredients',
      });
      renderForm();

      type('Name', 'Testwort');
      addEntry('Celestial Body', 'Mercury');
      save();

      expect(await screen.findByRole('alert')).toHaveTextContent('Viewers cannot add ingredients');
      expect(textbox('Name')).toHaveValue('Testwort');
      expect(removeButton('Mercury')).toBeInTheDocument();
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

  // What the form does with the picker: the picks sent, and an
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

    // An unknown entry takes either, so a name typed before the kind
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

      // A formal name with no kind saves as unknown, so it asks for none.
      choose('Classification', 'Unknown');
      type('Formal Name', 'Fixtura testalis');
      expect(select('Classification')).not.toBeRequired();
    });
  });

  // Undo and redo: the hook is tested in tests/components/Field; this
  // is its wiring in the form.
  describe('its undo and redo', () => {
    it('undoes a classification pick together with the formal name it emptied, focusing Classification, and redoes both', async () => {
      renderForm();
      type('Name', 'Testwort');
      type('Formal Name', 'Fixtura testalis');
      await settle();
      choose('Classification', 'None');
      expect(textbox('Formal Name')).toHaveValue('');
      act(() => textbox('Name').focus());
      // Leaving Formal Name validates it.
      await settle();

      undo();

      expect(textbox('Formal Name')).toHaveValue('Fixtura testalis');
      expect(textbox('Formal Name')).toBeEnabled();
      expect(select('Classification')).toHaveFocus();

      redo();

      expect(textbox('Formal Name')).toHaveValue('');
      expect(textbox('Formal Name')).toBeDisabled();
      // Leaving a field validates it; let that land inside the test.
      await settle();
    });

    it('undoes a keyboard reorder of an ordered list and redoes it', async () => {
      layOutChips();
      renderForm();
      for (const colour of ['Silver', 'Green', 'Amber']) addEntry('Colour', colour);
      await settle();
      const order = () =>
        within(screen.getByRole('group', { name: 'Colours' }))
          .getAllByRole('button', { name: /^Remove / })
          .map((button) => button.getAttribute('aria-label'));
      const inOrder = ['Remove Silver', 'Remove Green', 'Remove Amber'];
      await moveByKeyboard(
        screen.getByRole('button', { name: 'Move Amber' }),
        'ArrowLeft',
        'ArrowLeft',
      );
      const moved = ['Remove Amber', 'Remove Silver', 'Remove Green'];
      expect(order()).toEqual(moved);

      undo();
      expect(order()).toEqual(inOrder);

      redo();
      expect(order()).toEqual(moved);
      vi.restoreAllMocks();
    });

    it('changes nothing while a save is in flight, and has nothing to undo once it lands', async () => {
      let finish: () => void = () => {};
      const gate = new Promise<void>((resolve) => (finish = resolve));
      server.use(
        graphqlLink.mutation('CreateWorkspaceIngredient', async ({ variables }) => {
          await gate;
          const { name } = (variables as { input: { name: string } }).input;
          return HttpResponse.json({
            data: {
              createWorkspaceIngredient: {
                id: 'saved-1',
                name,
                slug: 'saved',
                revision: 1,
                stock: [],
              },
            },
          });
        }),
      );
      const onSaved = renderForm();
      type('Name', 'Testwort');
      await settle();
      type('Name', 'Testwort Two');
      await settle();
      saveAnother();
      // The mutation is held, so the form stays mid-save.
      await settle();
      act(() => textbox('Name').focus());

      undo();
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

      expect(textbox('Name')).toHaveValue('Testwort Two');

      finish();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      await settle();
      await waitFor(() => expect(textbox('Name')).toHaveValue(''));
      expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
      undo();

      expect(textbox('Name')).toHaveValue('');
    });

    it('reads a chord inside the new reference panel as the panel\u2019s own, leaving the form\u2019s history alone', async () => {
      renderForm();
      type('Name', 'Testwort');
      await settle();
      fireEvent.click(box('Reference'));
      fireEvent.click(await screen.findByRole('option', { name: 'New Reference' }));
      chooseKind('Book');
      const title = inPanel('Title');
      act(() => title.focus());
      await settle();
      typeIn(title, 'Fixture Notes');
      expect(title).toHaveValue('Fixture Notes');

      undo();

      expect(inPanel('Title')).toHaveValue('');
      expect(textbox('Name')).toHaveValue('Testwort');
    });
  });

  // The duplicate warning, as only the whole form holds it: the form asks its
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
    // The region once its last rows have faded: they leave on the slide's
    // net, and the notice with them.
    const emptied = async () => {
      await act(() => vi.advanceTimersByTimeAsync(600));
      expect(warning()).toHaveTextContent('');
    };
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
      await emptied();
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
      await emptied();
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

  // The + on a duplicate match, as only the whole form sends it.
  describe('using a compendium entry of the name typed', () => {
    const CLAW: DuplicateNode = {
      id: 'claw-1',
      name: "Cat's Claw",
      canonicalName: 'Uncaria tomentosa',
      slug: 'cats-claw-uncaria-tomentosa',
      isGlobal: true,
    };
    /** Adds as the server does in a coven that already calls another entry by the name typed: any label sent is refused as taken, as Rose under "rosemary" was. */
    const accept = () => {
      const adds: AddCupboardEntryFromFormMutationVariables[] = [];
      server.use(
        graphqlLink.mutation<
          AddCupboardEntryFromFormMutation,
          AddCupboardEntryFromFormMutationVariables
        >('AddCupboardEntryFromForm', ({ variables }) => {
          adds.push(variables);
          if (variables.input?.label != null) {
            const taken = new ValidationError([
              { path: ['label'], message: 'This coven already calls another entry that' },
            ]);
            return HttpResponse.json({
              errors: [maskError(taken, 'Unexpected error.')],
              data: null,
            });
          }
          return HttpResponse.json({ data: { addCupboardEntry: { id: 'cupboard-1' } } });
        }),
      );
      return adds;
    };

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('puts the entry in the cupboard under its own name, the typed name sent as no label even where the coven already calls another entry that, creates nothing, and keeps the form open', async () => {
      const creates = acceptCreate();
      const adds = accept();
      const onSaved = renderForm();
      offerDuplicates([CLAW]);
      offerCompendiumMatches([CLAW]);

      type('Name', 'Porch Claw');
      type('Description', 'Dried from the porch.');
      save();
      fireEvent.click(await screen.findByRole('button', { name: /^Add to My Ingredients: / }));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(adds).toEqual([
        {
          workspaceId: WORKSPACE_ID,
          ingredientId: 'claw-1',
          input: expect.objectContaining({ description: 'Dried from the porch.' }),
        },
      ]);
      expect(adds[0].input?.label).toBeUndefined();
      expect(onSaved.mock.calls[0]).toEqual([
        expect.objectContaining({ id: 'claw-1', name: "Cat's Claw" }),
        'another',
      ]);
      expect(creates).toHaveLength(0);
    });

    // The lookups' cached answers still said the
    // entry was not held, so its row stayed under In the Compendium with its +.
    const heldRow = () =>
      within(screen.getByRole('list', { name: 'In This Coven' })).getByRole('link', {
        name: /^Cat's Claw \(Uncaria tomentosa\)/,
      });

    it('lists the exact match as in the cupboard once its + has added it, from a held save', async () => {
      accept();
      renderForm();
      offerDuplicates([CLAW]);
      offerCompendiumMatches([CLAW]);

      type('Name', 'Porch Claw');
      save();
      const plus = await screen.findByRole('button', { name: /^Add to My Ingredients: / });
      offerDuplicates([{ ...CLAW, inCupboard: true }]);
      offerCompendiumMatches([{ ...CLAW, inCupboard: true }]);
      fireEvent.click(plus);
      await waitFor(() => expect(plus).toHaveAttribute('data-state', 'added'));
      act(() => vi.advanceTimersByTime(ADDED_HOLD_MS));

      await waitFor(() => expect(heldRow()).toBeInTheDocument());
    });

    // After the add the form stays open, rather than opening the entry's page. The + turning to
    // the check, then the eye, and the
    // row moving under In This Coven are NameField's, in duplicates.test.tsx.
    describe('after the + has added', () => {
      /** The form in a coven named Hedge Coven, under the page's status region. */
      const renderInCoven = () => {
        const onSaved = vi.fn();
        offerNothing();
        offerCategories([]);
        renderWithClient(
          <StatusRegionProvider>
            <IngredientForm
              duplicateHref={duplicateHref}
              workspaceId={WORKSPACE_ID}
              workspaceName="Hedge Coven"
              onSaved={onSaved}
            />
          </StatusRegionProvider>,
        );
        return onSaved;
      };

      /** Types a name that finds Cat's Claw, and presses its +, the server holding it from then on. */
      const addClaw = async () => {
        offerDuplicates([CLAW]);
        type('Name', 'Porch Claw');
        act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
        const plus = await screen.findByRole('button', { name: /^Add to My Ingredients: / });
        offerDuplicates([{ ...CLAW, inCupboard: true }]);
        act(() => plus.focus());
        fireEvent.click(plus);
        return plus;
      };

      it('keeps the form open with what was typed, and says the add once, in the page status region', async () => {
        accept();
        const onSaved = renderInCoven();
        type('Description', 'Dried from the porch.');
        await addClaw();

        await waitFor(() => expect(statusesSaying('Added to Hedge Coven.')).toHaveLength(1));
        expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'claw-1' }), 'another');
        expect(textbox('Name')).toHaveValue('Porch Claw');
        expect(textbox('Description')).toHaveValue('Dried from the porch.');
        // The form's own Saved notice would say it a second time.
        expect(statusesSaying("Saved Cat's Claw")).toHaveLength(0);

        act(() => vi.advanceTimersByTime(ADDED_HOLD_MS));
        await waitFor(() => expect(heldRow()).toBeInTheDocument());
        expect(statusesSaying('Added to Hedge Coven.')).toHaveLength(1);
      });

      it('says a refusal at the form head, with no check, and announces nothing', async () => {
        mockGraphQLError('AddCupboardEntryFromForm', {
          code: 'VALIDATION',
          fieldErrors: [{ path: [], message: 'The coven cannot take new ingredients right now' }],
        });
        const onSaved = renderInCoven();
        const plus = await addClaw();

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('The coven cannot take new ingredients right now');
        expect(
          alert.compareDocumentPosition(textbox('Name')) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(plus).not.toHaveAttribute('data-state');
        expect(plus).not.toHaveAttribute('aria-disabled');
        expect(plus).toHaveAccessibleName(/^Add to My Ingredients: Cat's Claw/);
        expect(onSaved).not.toHaveBeenCalled();
        expect(statusesSaying('Added to')).toHaveLength(0);
      });
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

    it('asks the New Form box about this coven, sends its pick as a variant by id, and clears it with the rest after Save & Add Another', async () => {
      const SUBSTANCE_WAX_ID = '6e1f2a3b-4c5d-4e7f-8a9b-0c1d2e3f4a5b';
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerForms([
        {
          id: SUBSTANCE_WAX_ID,
          value: 'Wax',
          description: null,
          group: 'Substance',
          icon: null,
          curated: true,
          claimants: [],
        },
      ]);

      await pickFrom('New Form', calls, /^Wax \(Substance\)/);
      expect(calls[0]).toEqual({ workspaceId: WORKSPACE_ID, query: '', first: 10 });
      type('Name', 'Testwort');
      saveAnother();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.variants).toEqual([
        expect.objectContaining({ form: 'Wax', formId: SUBSTANCE_WAX_ID }),
      ]);
      await waitFor(() => expect(textbox('Name')).toHaveValue(''));
      expect(screen.queryByRole('group', { name: 'Wax' })).not.toBeInTheDocument();
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
          entry: 'Celestial Body',
          calls: offerCelestialBodies([{ value: 'Moon', description: null, curated: true }]),
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
              matchedName: null,
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
              description: null,
              isGlobal: false,
              variants: [],
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
        celestialBodies: ['Moon'],
        zodiacSigns: ['Cancer'],
        deities: [{ deityId: GREEK_HECATE_ID }],
        substitutes: [{ ingredientId: COVEN_ID }],
      });
    });
  });

  // The save's result carries the new entry's jars for the dialog's status to
  // name. A save moves none, so only a mock fills it.
  it('hands onSaved the jars the new entry holds', async () => {
    mockGraphQLMutation<
      CreateWorkspaceIngredientMutation,
      CreateWorkspaceIngredientMutationVariables
    >('CreateWorkspaceIngredient', (variables) => ({
      createWorkspaceIngredient: {
        id: 'saved-1',
        name: variables.input.name,
        slug: 'saved',
        revision: 1,
        stock: [{ quantityOnHand: 30, unit: 'g', variant: { form: 'Dried' } }],
      },
    }));
    const onSaved = renderForm();

    type('Name', 'Testwort');
    save();

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onSaved.mock.calls[0]![0].stock).toEqual([
      { quantityOnHand: 30, unit: 'g', variant: { form: 'Dried' } },
    ]);
  });

  it('holds both saves down while one is in flight, Save Ingredient busy', async () => {
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
              revision: 1,
              stock: [],
            },
          },
        });
      }),
    );
    const onSaved = renderForm();
    const submit = screen.getByRole('button', { name: 'Save Ingredient' });
    const rest = screen.getByRole('button', { name: 'Save & Add Another' });

    type('Name', 'Testwort');
    submit.focus();
    fireEvent.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    // Busy; the other is held down beside it.
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(rest).toBeDisabled();
    expect(rest).not.toHaveAttribute('aria-busy');
    release();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    // Released once answered; what it saved is now the form's baseline, so both wait for a change.
    await waitFor(() => expect(submit).not.toHaveAttribute('aria-busy'));
    type('Name', 'Testworts');
    await waitFor(() => expect(submit).toBeEnabled());
    expect(rest).toBeEnabled();
  });
});

// Where the focus lands after an undo: a list's rows are not inputs,
// only its typing box is, so the box is where a change to the list is shown.
describe('IngredientForm undo focus', () => {
  const undoFrom = (from: HTMLElement) => {
    act(() => from.focus());
    fireEvent.keyDown(from, { key: 'z', ctrlKey: true });
  };

  it('lands on a list’s box after undoing the removal of an entry, and after redoing it', async () => {
    renderForm();
    addEntry('Colour', 'Silver');
    fireEvent.click(removeButton('Silver'));

    undoFrom(textbox('Name'));
    expect(removeButton('Silver')).toBeInTheDocument();
    expect(box('Colour')).toHaveFocus();

    act(() => textbox('Name').focus());
    fireEvent.keyDown(textbox('Name'), { key: 'z', ctrlKey: true, shiftKey: true });
    expect(screen.queryByLabelText('Remove Silver')).toBeNull();
    expect(box('Colour')).toHaveFocus();
    await settle();
  });
});
