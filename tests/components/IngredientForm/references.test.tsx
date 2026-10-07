import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import type {
  CreateReferenceMutation,
  CreateReferenceMutationVariables,
  CreateWorkspaceIngredientMutation,
  CreateWorkspaceIngredientMutationVariables,
  ReferenceSuggestionsQueryVariables,
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
import type { ReferenceNode } from './types';

// The References field (MB.154): a search over `referenceSuggestions`, each
// source picked becoming a row beneath the box with its locator, and a
// citation sub-form, inline, whose save adds a new source to the list. Only
// ids and locators are sent (claude-docs/components/ingredient-form.md,
// "The references").

const WORKSPACE_ID = '7b0c1c3e-5f4a-4d8e-9a51-3c2f0e6d9b17';
const COMPENDIUM_ID = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const COVEN_ID = '6f5e4d3c-2b1a-4f9e-8d7c-6b5a4f3e2d1c';
const NEW_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

// Invented sources (M1.25): a real title is only safe until someone seeds it.
const HERBAL: ReferenceNode = {
  id: COMPENDIUM_ID,
  citation: 'Fixture, Ada. The Testwort Herbal. Mockford: Fixture Press, 1901.',
  isGlobal: true,
};
const NOTES: ReferenceNode = {
  id: COVEN_ID,
  citation: 'Placeholder, Bram. "Notes on Mockleaf." Journal of Fixtures 3 (1950): 12–19.',
  isGlobal: false,
};

/** Answers every lookup the form makes empty, so a test answers the one it is about after rendering. */
function answerLookupsEmpty() {
  for (const [operation, field] of [
    ['FormSuggestions', 'formSuggestions'],
    ['CommonNameSuggestions', 'commonNameSuggestions'],
    ['PlanetSuggestions', 'planetSuggestions'],
    ['ZodiacSuggestions', 'zodiacSuggestions'],
    ['DeitySuggestions', 'deitySuggestions'],
    ['IngredientSuggestions', 'ingredientSuggestions'],
    ['PossibleDuplicates', 'possibleDuplicates'],
    ['ReferenceSuggestions', 'referenceSuggestions'],
    ['PickerCategories', 'categories'],
  ]) {
    mockGraphQLQuery<Record<string, unknown>>(operation, () => ({ [field]: { edges: [] } }));
  }
}

/** Answers `ReferenceSuggestions` with these rows, recording each ask. */
function offerSources(nodes: ReferenceNode[]) {
  const calls: ReferenceSuggestionsQueryVariables[] = [];
  mockGraphQLQuery<Record<string, unknown>, ReferenceSuggestionsQueryVariables>(
    'ReferenceSuggestions',
    (variables) => {
      calls.push(variables);
      return { referenceSuggestions: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

/** Answers `CreateReference` with a new source reading `citation`, recording each ask. */
function acceptReference(citation = 'Mock, Cyril. A Fixture Grimoire. Mockford, 1999.') {
  const calls: CreateReferenceMutationVariables[] = [];
  mockGraphQLMutation<CreateReferenceMutation, CreateReferenceMutationVariables>(
    'CreateReference',
    (variables) => {
      calls.push(variables);
      return { createReference: { id: NEW_ID, citation, isGlobal: false } };
    },
  );
  return calls;
}

/** Answers `CreateWorkspaceIngredient` with a saved row, recording each ask. */
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

function renderForm() {
  const onSaved = vi.fn();
  answerLookupsEmpty();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <IngredientForm workspaceId={WORKSPACE_ID} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return onSaved;
}

const references = () => screen.getByRole('group', { name: 'References' });
const box = () => screen.getByRole('combobox', { name: 'Reference' });
const rows = () => within(references()).queryAllByRole('listitem');
const row = (citation: string) =>
  rows().find((item) => item.textContent?.includes(citation)) ??
  (() => {
    throw new Error(`No row for ${citation}`);
  })();
const changes = () => within(references()).getByRole('status', { name: 'References changes' });
const panel = () => screen.getByRole('group', { name: 'New Reference' });
/** A label's text less a required field's asterisk, which is hidden from its name. */
const labelled = (label: string) => (content: string) => content.replace(/\*$/, '') === label;
const inPanel = (label: string) => within(panel()).getByLabelText(labelled(label));
const notInPanel = (label: string) =>
  expect(within(panel()).queryByLabelText(labelled(label))).toBeNull();
const typeIn = (control: HTMLElement, value: string) =>
  fireEvent.change(control, { target: { value } });
/** Presses a button, focusing it first as a real click would: fireEvent moves no focus. */
const press = (button: HTMLElement) => {
  button.focus();
  fireEvent.click(button);
};
const save = () => press(screen.getByRole('button', { name: 'Save Ingredient' }));
const chooseKind = (label: string) => {
  fireEvent.click(within(panel()).getByRole('combobox', { name: 'Kind' }));
  fireEvent.click(
    within(screen.getByRole('listbox', { name: 'Kind choices' })).getByRole('option', {
      name: label,
    }),
  );
};
const openPanel = () => press(screen.getByRole('button', { name: 'New Reference' }));

const settle = () => act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
/** Focuses the box, waits for its first, empty ask, then types `text` and lets it settle. */
async function lookUp(calls: unknown[], text: string) {
  act(() => box().focus());
  await waitFor(() => expect(calls).toHaveLength(1));
  typeIn(box(), text);
  settle();
  await waitFor(() => expect(calls).toHaveLength(2));
}
/** Looks up `text` and picks the source reading `citation` by click. */
async function pick(calls: unknown[], text: string, citation: string) {
  await lookUp(calls, text);
  fireEvent.click(
    await screen.findByRole('option', { name: new RegExp(`^${escapeRegExp(citation)}`) }),
  );
}
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every label a panel field may carry, across the five kinds. */
const ALL_LABELS = [
  'Title',
  'Chapter Title',
  'Article Title',
  'Entry',
  'Page Title',
  'Book',
  'Journal',
  'Reference Work',
  'Site',
  'Authors',
  'Contributors',
  'Edition',
  'Volume',
  'Issue',
  'Series',
  'Place',
  'Publisher',
  'Published',
  'Pages',
  'Read Through',
  'Address',
  'Last Modified',
  'Accessed',
  'Note',
];
const TAIL = ['Read Through', 'Address', 'Last Modified', 'Accessed', 'Note'];

/** Each kind: its choice's label, its fields in order, and the ones it requires. */
const KINDS = [
  {
    kind: 'book',
    label: 'Book',
    fields: [
      'Title',
      'Authors',
      'Contributors',
      'Edition',
      'Volume',
      'Series',
      'Place',
      'Publisher',
      'Published',
      ...TAIL,
    ],
    required: ['Title', 'Published'],
  },
  {
    kind: 'chapter',
    label: 'Chapter in a Book',
    fields: [
      'Chapter Title',
      'Book',
      'Authors',
      'Contributors',
      'Pages',
      'Edition',
      'Volume',
      'Series',
      'Place',
      'Publisher',
      'Published',
      ...TAIL,
    ],
    required: ['Chapter Title', 'Book'],
  },
  {
    kind: 'article',
    label: 'Journal Article',
    fields: [
      'Article Title',
      'Journal',
      'Authors',
      'Volume',
      'Issue',
      'Published',
      'Pages',
      ...TAIL,
    ],
    required: ['Article Title', 'Journal'],
  },
  {
    kind: 'entry',
    label: 'Reference-Work Entry',
    fields: [
      'Entry',
      'Reference Work',
      'Authors',
      'Edition',
      'Contributors',
      'Place',
      'Publisher',
      'Published',
      ...TAIL,
    ],
    required: ['Entry', 'Reference Work'],
  },
  {
    kind: 'web_page',
    label: 'Web Page',
    fields: [
      'Page Title',
      'Site',
      'Authors',
      'Publisher',
      'Published',
      'Last Modified',
      'Address',
      'Accessed',
      'Note',
    ],
    required: ['Page Title', 'Address', 'Accessed'],
  },
] as const;

describe('IngredientForm — references', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('the search', () => {
    it('asks for this coven once the typing settles, and not before the box is used', async () => {
      renderForm();
      const calls = offerSources([HERBAL]);

      settle();
      expect(calls).toHaveLength(0);

      act(() => box().focus());
      await waitFor(() => expect(calls).toHaveLength(1));
      typeIn(box(), 'testwort');
      act(() => vi.advanceTimersByTime(DEBOUNCE_MS - 1));
      expect(calls).toHaveLength(1);
      settle();

      await waitFor(() => expect(calls).toHaveLength(2));
      expect(calls[1]).toMatchObject({ workspaceId: WORKSPACE_ID, query: 'testwort' });
    });

    it('offers "Add a reference" first, then each source by its citation and whose it is, in the order found', async () => {
      renderForm();
      const calls = offerSources([NOTES, HERBAL]);

      await lookUp(calls, 'fixture');

      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Add a reference',
        `${NOTES.citation}This coven’s source`,
        `${HERBAL.citation}Compendium source`,
      ]);
      expect(screen.queryByRole('option', { name: /Use what you typed/ })).not.toBeInTheDocument();
    });

    it('does not offer a source already listed', async () => {
      renderForm();
      const calls = offerSources([HERBAL, NOTES]);

      await pick(calls, 'fixture', HERBAL.citation);
      fireEvent.keyDown(box(), { key: 'ArrowDown' });

      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
      expect(
        screen.queryByRole('option', { name: new RegExp(escapeRegExp(HERBAL.citation)) }),
      ).toBe(null);
    });
  });

  describe('the list', () => {
    it('adds a picked source as a row beneath the box reading its citation, and says so', async () => {
      renderForm();
      const calls = offerSources([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);

      expect(rows()).toHaveLength(1);
      expect(row(HERBAL.citation)).toHaveTextContent('Compendium source');
      expect(changes()).toHaveTextContent(`Added ${HERBAL.citation}`);
      // The box empties and keeps the focus, for the next one.
      expect(box()).toHaveValue('');
      expect(box()).toHaveFocus();
    });

    it('adds a source picked by keyboard', async () => {
      renderForm();
      const calls = offerSources([HERBAL]);

      await lookUp(calls, 'testwort');
      await screen.findByRole('option', { name: new RegExp(escapeRegExp(HERBAL.citation)) });
      fireEvent.keyDown(box(), { key: 'ArrowDown' });
      fireEvent.keyDown(box(), { key: 'ArrowDown' });
      fireEvent.keyDown(box(), { key: 'Enter' });

      expect(rows()).toHaveLength(1);
      expect(row(HERBAL.citation)).toBeInTheDocument();
    });

    it("gives each row a locator, labelled and read with its source's citation", async () => {
      renderForm();
      const calls = offerSources([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);

      const locator = within(row(HERBAL.citation)).getByRole('textbox', { name: 'Locator' });
      expect(locator).toHaveAccessibleDescription(expect.stringContaining(HERBAL.citation));
    });

    it('explains the locator in a tip beside it, read with the box', async () => {
      renderForm();
      const calls = offerSources([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);

      const inRow = within(row(HERBAL.citation));
      expect(inRow.getByRole('button', { name: 'About Locator' })).toBeInTheDocument();
      expect(inRow.getByRole('textbox', { name: 'Locator' })).toHaveAccessibleDescription(
        expect.stringContaining('Where in the source'),
      );
    });

    it('removes a row by its ×, keeping the focus in the box, and says so', async () => {
      renderForm();
      const calls = offerSources([HERBAL, NOTES]);

      await pick(calls, 'testwort', HERBAL.citation);
      fireEvent.keyDown(box(), { key: 'ArrowDown' });
      fireEvent.click(
        await screen.findByRole('option', { name: new RegExp(`^${escapeRegExp(NOTES.citation)}`) }),
      );
      press(screen.getByRole('button', { name: `Remove ${HERBAL.citation}` }));

      expect(rows()).toHaveLength(1);
      expect(row(NOTES.citation)).toBeInTheDocument();
      expect(changes()).toHaveTextContent(`Removed ${HERBAL.citation}`);
      expect(box()).toHaveFocus();
    });

    it('takes the last row on Backspace in the empty box, as every list does', async () => {
      renderForm();
      const calls = offerSources([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);
      fireEvent.keyDown(box(), { key: 'Backspace' });

      expect(rows()).toHaveLength(0);
      expect(changes()).toHaveTextContent(`Removed ${HERBAL.citation}`);
    });

    it('never submits the ingredient on Enter in the box with nothing picked', async () => {
      const saves = acceptCreate();
      renderForm();
      offerSources([]);

      typeIn(screen.getByRole('textbox', { name: 'Name' }), 'Testwort');
      typeIn(box(), 'fixture');
      const enter = fireEvent.keyDown(box(), { key: 'Enter' });

      expect(enter).toBe(false);
      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(saves).toHaveLength(0);
      expect(rows()).toHaveLength(0);
    });
  });

  describe('what it sends', () => {
    it('tidies a locator as it is left, its ranges dashed, several places in one', async () => {
      renderForm();
      const calls = offerSources([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);
      const locator = within(row(HERBAL.citation)).getByRole('textbox', { name: 'Locator' });
      typeIn(locator, ' pp. 12-19,   40; chap. 3 ');
      fireEvent.blur(locator);

      expect(locator).toHaveValue('pp. 12–19, 40; chap. 3');
    });

    it('sends each source by its id with its locator as typed, and no citation text', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerSources([HERBAL, NOTES]);

      await pick(calls, 'fixture', HERBAL.citation);
      fireEvent.keyDown(box(), { key: 'ArrowDown' });
      fireEvent.click(
        await screen.findByRole('option', { name: new RegExp(`^${escapeRegExp(NOTES.citation)}`) }),
      );
      typeIn(within(row(HERBAL.citation)).getByRole('textbox', { name: 'Locator' }), 'p. 112');
      typeIn(screen.getByRole('textbox', { name: 'Name' }), 'Testwort');
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.references).toEqual([
        { referenceId: COMPENDIUM_ID, locator: 'p. 112' },
        { referenceId: COVEN_ID, locator: '' },
      ]);
      expect(JSON.stringify(saves[0].input)).not.toContain('Herbal');
      expect(LocalIngredientInput.parse(saves[0].input).references).toEqual([
        { referenceId: COMPENDIUM_ID, locator: 'p. 112' },
        { referenceId: COVEN_ID, locator: null },
      ]);
    });

    it('sends no references as an empty list', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();

      typeIn(screen.getByRole('textbox', { name: 'Name' }), 'Testwort');
      save();

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.references).toEqual([]);
    });

    it('puts a server error naming a source on its row, through the field’s one error element', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['references', 1], message: 'No such source' }],
      });
      renderForm();
      const calls = offerSources([HERBAL, NOTES]);

      await pick(calls, 'fixture', HERBAL.citation);
      fireEvent.keyDown(box(), { key: 'ArrowDown' });
      fireEvent.click(
        await screen.findByRole('option', { name: new RegExp(`^${escapeRegExp(NOTES.citation)}`) }),
      );
      typeIn(screen.getByRole('textbox', { name: 'Name' }), 'Testwort');
      save();

      const message = `${NOTES.citation}: No such source`;
      await waitFor(() => expect(box()).toBeInvalid());
      expect(box()).toHaveAccessibleDescription(expect.stringContaining(message));
      expect(
        screen.getByRole('button', { name: `Remove ${NOTES.citation}` }),
      ).toHaveAccessibleDescription(expect.stringContaining('No such source'));
      expect(
        screen.getByRole('button', { name: `Remove ${HERBAL.citation}` }),
      ).not.toHaveAccessibleDescription(expect.stringContaining('No such source'));
      expect(box()).toHaveFocus();
    });

    it('clears the references after Save & Add Another, the panel closed with them', async () => {
      acceptCreate();
      const onSaved = renderForm();
      const calls = offerSources([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);
      typeIn(screen.getByRole('textbox', { name: 'Name' }), 'Testwort');
      press(screen.getByRole('button', { name: 'Save & Add Another' }));

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.anything(), 'another'));
      await waitFor(() => expect(rows()).toHaveLength(0));
      expect(screen.getByRole('button', { name: 'New Reference' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    it('refuses a save while the box holds a search, until it is cleared', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      offerSources([]);

      typeIn(screen.getByRole('textbox', { name: 'Name' }), 'Testwort');
      typeIn(box(), 'testwort');
      save();

      await waitFor(() => expect(box()).toBeInvalid());
      expect(box()).toHaveAccessibleDescription(
        expect.stringContaining('Pick a source for "testwort", or clear the box'),
      );
      expect(saves).toHaveLength(0);

      typeIn(box(), '');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
    });
  });

  describe('the new reference panel', () => {
    it('opens from New Reference, with Kind focused and no other field until one is chosen', () => {
      renderForm();

      openPanel();

      expect(within(panel()).getByRole('combobox', { name: 'Kind' })).toHaveFocus();
      for (const label of ALL_LABELS) notInPanel(label);
    });

    it('opens from the list’s "Add a reference" row too', async () => {
      renderForm();
      const calls = offerSources([HERBAL]);

      await lookUp(calls, 'testwort');
      fireEvent.click(await screen.findByRole('option', { name: 'Add a reference' }));

      expect(within(panel()).getByRole('combobox', { name: 'Kind' })).toHaveFocus();
    });

    // The owner's call: asking again for a panel already open takes you
    // back to it, rather than doing nothing.
    it('takes you back to Kind when asked again while open, keeping what was typed', async () => {
      renderForm();
      const calls = offerSources([HERBAL]);
      openPanel();
      chooseKind('Book');
      typeIn(inPanel('Title'), 'The Testwort Herbal');

      act(() => box().focus());
      openPanel();
      expect(within(panel()).getByRole('combobox', { name: 'Kind' })).toHaveFocus();

      await lookUp(calls, 'testwort');
      fireEvent.click(await screen.findByRole('option', { name: 'Add a reference' }));
      expect(within(panel()).getByRole('combobox', { name: 'Kind' })).toHaveFocus();
      expect(inPanel('Title')).toHaveValue('The Testwort Herbal');
    });

    it.each(KINDS)(
      'shows only the fields a $label needs, in order, marking the required ones',
      ({ label, fields, required }) => {
        renderForm();
        openPanel();

        chooseKind(label);

        const controls = fields.map((field) => inPanel(field));
        for (const [index, control] of controls.entries()) {
          if (index > 0) {
            // Each after the last, in the page.
            expect(
              controls[index - 1].compareDocumentPosition(control) &
                Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
          }
          const marked = (required as readonly string[]).includes(fields[index]);
          if (marked) expect(control).toHaveAttribute('aria-required', 'true');
          else expect(control).not.toHaveAttribute('aria-required');
        }
        for (const other of ALL_LABELS.filter(
          (name) => !(fields as readonly string[]).includes(name),
        )) {
          notInPanel(other);
        }
      },
    );

    it('refuses a chapter with no book beside the Book field, sending nothing', async () => {
      const calls = acceptReference();
      renderForm();
      openPanel();

      chooseKind('Chapter in a Book');
      typeIn(inPanel('Chapter Title'), 'On Mockleaf');
      press(within(panel()).getByRole('button', { name: 'Save Reference' }));

      await waitFor(() => expect(inPanel('Book')).toBeInvalid());
      expect(inPanel('Book')).toHaveAccessibleDescription(
        expect.stringContaining('Name the book this chapter is in'),
      );
      expect(inPanel('Book')).toHaveFocus();
      expect(calls).toHaveLength(0);
    });

    it('refuses a web page with no address or day read, each beside its field', async () => {
      renderForm();
      openPanel();

      chooseKind('Web Page');
      typeIn(inPanel('Page Title'), 'Mockleaf');
      press(within(panel()).getByRole('button', { name: 'Save Reference' }));

      await waitFor(() => expect(inPanel('Address')).toBeInvalid());
      expect(inPanel('Address')).toHaveAccessibleDescription(
        expect.stringContaining('A web page needs its address'),
      );
      expect(inPanel('Accessed')).toHaveAccessibleDescription(
        expect.stringContaining('A web page needs the day it was read'),
      );
    });

    it('puts a server field error beside the field it names, through the element a resolver error uses', async () => {
      mockGraphQLError('CreateReference', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['title'], message: 'That title is taken' }],
      });
      renderForm();
      openPanel();

      chooseKind('Book');
      typeIn(inPanel('Published'), '1901');
      press(within(panel()).getByRole('button', { name: 'Save Reference' }));
      await waitFor(() => expect(inPanel('Title')).toBeInvalid());
      const resolverError = inPanel('Title').getAttribute('aria-describedby');

      typeIn(inPanel('Title'), 'The Testwort Herbal');
      press(within(panel()).getByRole('button', { name: 'Save Reference' }));

      await waitFor(() =>
        expect(inPanel('Title')).toHaveAccessibleDescription(
          expect.stringContaining('That title is taken'),
        ),
      );
      expect(inPanel('Title')).toBeInvalid();
      expect(inPanel('Title').getAttribute('aria-describedby')).toBe(resolverError);
    });

    it('says a refusal naming no field inside the panel', async () => {
      mockGraphQLError('CreateReference', { code: 'FORBIDDEN', message: 'Not yours.' });
      renderForm();
      openPanel();

      chooseKind('Book');
      typeIn(inPanel('Title'), 'The Testwort Herbal');
      typeIn(inPanel('Published'), '1901');
      press(within(panel()).getByRole('button', { name: 'Save Reference' }));

      expect(await within(panel()).findByRole('alert')).toHaveTextContent('Not yours.');
    });

    it('saves a new source to this coven and adds it to the list by its id, closing', async () => {
      const calls = acceptReference();
      const saves = acceptCreate();
      const onSaved = renderForm();
      openPanel();

      chooseKind('Book');
      typeIn(inPanel('Title'), 'A Fixture Grimoire');
      typeIn(inPanel('Authors'), 'Mock, Cyril');
      typeIn(inPanel('Published'), '1999');
      press(within(panel()).getByRole('button', { name: 'Save Reference' }));

      await waitFor(() =>
        expect(screen.queryByRole('group', { name: 'New Reference' })).toBeNull(),
      );
      expect(calls).toHaveLength(1);
      expect(calls[0].workspaceId).toBe(WORKSPACE_ID);
      expect(calls[0].input).toMatchObject({
        kind: 'book',
        title: 'A Fixture Grimoire',
        authors: 'Mock, Cyril',
        published: '1999',
        // A day left blank goes as none: the scalar takes no empty text.
        accessed: null,
        modified: null,
      });
      const citation = 'Mock, Cyril. A Fixture Grimoire. Mockford, 1999.';
      expect(row(citation)).toHaveTextContent('This coven’s source');
      expect(changes()).toHaveTextContent(`Added ${citation}`);
      expect(box()).toHaveFocus();

      typeIn(screen.getByRole('textbox', { name: 'Name' }), 'Testwort');
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(saves[0].input.references).toEqual([{ referenceId: NEW_ID, locator: '' }]);
    });

    it("sends only the chosen kind's fields, leaving what another kind took behind", async () => {
      const calls = acceptReference();
      renderForm();
      openPanel();

      chooseKind('Web Page');
      typeIn(inPanel('Page Title'), 'Mockleaf');
      typeIn(inPanel('Site'), 'Fixture Wiki');
      chooseKind('Book');
      typeIn(inPanel('Published'), '1999');
      // What was typed is kept for its own kind.
      expect(inPanel('Title')).toHaveValue('Mockleaf');
      press(within(panel()).getByRole('button', { name: 'Save Reference' }));

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0].input).toMatchObject({ kind: 'book', title: 'Mockleaf', container: null });
    });

    it('saves the reference, not the ingredient, on Enter in one of its fields', async () => {
      const calls = acceptReference();
      const saves = acceptCreate();
      renderForm();
      typeIn(screen.getByRole('textbox', { name: 'Name' }), 'Testwort');
      openPanel();

      chooseKind('Book');
      typeIn(inPanel('Title'), 'A Fixture Grimoire');
      typeIn(inPanel('Published'), '1999');
      const enter = fireEvent.keyDown(inPanel('Published'), { key: 'Enter' });

      expect(enter).toBe(false);
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(saves).toHaveLength(0);
    });

    // MB.154, the owner's calls: each field is tidied as it is left, as the
    // server will store it, so what is seen is what is saved.
    it.each([
      ['Title', '  "A Fixture   Grimoire" ', 'A Fixture Grimoire'],
      ['Edition', 'second edition', '2nd ed.'],
      ['Published', '1882-88', '1882–88'],
      ['Address', 'example.org/grimoire', 'https://example.org/grimoire'],
    ])('formats %s as it is left', (label, typed, formatted) => {
      renderForm();
      openPanel();
      chooseKind('Book');

      typeIn(inPanel(label), typed);
      fireEvent.blur(inPanel(label));

      expect(inPanel(label)).toHaveValue(formatted);
    });

    it('refuses what the shared schema refuses, beside the field: a date with no year', async () => {
      const calls = acceptReference();
      renderForm();
      openPanel();

      chooseKind('Book');
      typeIn(inPanel('Title'), 'A Fixture Grimoire');
      typeIn(inPanel('Published'), 'soon');
      press(within(panel()).getByRole('button', { name: 'Save Reference' }));

      await waitFor(() => expect(inPanel('Published')).toBeInvalid());
      expect(inPanel('Published')).toHaveAccessibleDescription(
        expect.stringContaining('Give the year it was published'),
      );
      expect(calls).toHaveLength(0);
    });

    // As the ingredient's saves are held, the owner's call: busy, and saying so.
    it('holds Save Reference down while it is in flight, busy and saying so, and Cancel with it', async () => {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        graphqlLink.mutation<CreateReferenceMutation, CreateReferenceMutationVariables>(
          'CreateReference',
          async () => {
            await held;
            return HttpResponse.json({
              data: {
                createReference: {
                  id: NEW_ID,
                  citation: 'A Fixture Grimoire. 1999.',
                  isGlobal: false,
                },
              },
            });
          },
        ),
      );
      renderForm();
      openPanel();
      chooseKind('Book');
      typeIn(inPanel('Title'), 'A Fixture Grimoire');
      typeIn(inPanel('Published'), '1999');
      const saveButton = within(panel()).getByRole('button', { name: 'Save Reference' });
      const cancel = within(panel()).getByRole('button', { name: 'Cancel' });

      press(saveButton);

      await waitFor(() => expect(saveButton).toBeDisabled());
      expect(saveButton).toHaveAttribute('aria-busy', 'true');
      expect(saveButton).toHaveAccessibleName('Saving Reference');
      expect(cancel).toBeDisabled();
      release();
      await waitFor(() =>
        expect(screen.queryByRole('group', { name: 'New Reference' })).toBeNull(),
      );
    });

    it('closes on Cancel, adding nothing, the focus back in the box', () => {
      const calls = acceptReference();
      renderForm();
      openPanel();

      chooseKind('Book');
      press(within(panel()).getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('group', { name: 'New Reference' })).toBeNull();
      expect(rows()).toHaveLength(0);
      expect(calls).toHaveLength(0);
      expect(box()).toHaveFocus();
    });

    it('stops the ingredient save while it is open, until it is saved or cancelled', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      typeIn(screen.getByRole('textbox', { name: 'Name' }), 'Testwort');
      openPanel();

      save();

      await waitFor(() =>
        expect(box()).toHaveAccessibleDescription(
          expect.stringContaining('Save the new reference, or cancel it'),
        ),
      );
      expect(saves).toHaveLength(0);

      press(within(panel()).getByRole('button', { name: 'Cancel' }));
      save();
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
    });
  });
});
