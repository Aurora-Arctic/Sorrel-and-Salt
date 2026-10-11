import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor as waitForDom,
  within,
} from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import { ReferencesField } from '@/components/IngredientForm/references';
import type { IngredientFormInput, IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES, ingredientResolver } from '@/components/IngredientForm/values';
import type {
  CreateWorkspaceIngredientMutation,
  CreateWorkspaceIngredientMutationVariables,
} from '@/gql/graphql';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { makeQueryClient } from '@/lib/graphql-client';
import { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import { mockGraphQLError, mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';
import {
  NEW_REFERENCE_ID,
  WORKSPACE_ID,
  acceptReference,
  offerDeities,
  offerDuplicates,
  offerForms,
  offerIngredients,
  offerNames,
  offerPlanets,
  offerReferences,
  offerSigns,
} from '../../support/msw/ingredient-lookups';
import type { ReferenceNode } from './types';

// The References field (MB.154) on its own (MB.182): `ReferencesField`, a
// search over `referenceSuggestions`, each source picked becoming a row
// beneath the box with its locator, and the new reference panel opened
// beneath it, in a form of its own on the form's resolver; what the resolver
// hands the submit is what the form sends. The panel's own behaviours are
// reference-panel.test.tsx's, and the search's debounce is lookups.test.tsx's
// and tests/lib/debounce.test.tsx's; what needs the whole form — the payload
// sent and cleared, and a server's error routed to a row — is at the end
// (claude-docs/components/ingredient-form.md, "Testing").

const COMPENDIUM_ID = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const COVEN_ID = '6f5e4d3c-2b1a-4f9e-8d7c-6b5a4f3e2d1c';

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

/** The field in a form of its own, its name given; the submit receives what the form would send. */
function renderField() {
  const onSubmit = vi.fn();
  const Harness = () => {
    const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
      defaultValues: { ...EMPTY_VALUES, name: 'Testwort' },
      resolver: ingredientResolver,
    });
    return (
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <ReferencesField workspaceId={WORKSPACE_ID} />
          <button type="submit">Save Ingredient</button>
        </form>
      </FormProvider>
    );
  };
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <Harness />
    </QueryClientProvider>,
  );
  return onSubmit;
}

/** The whole form, every lookup answered empty, as index.test.tsx renders it. */
function renderForm() {
  const onSaved = vi.fn();
  mockGraphQLQuery<Record<string, unknown>>('PickerCategories', () => ({
    categories: { edges: [] },
  }));
  offerForms([]);
  offerNames([]);
  offerPlanets([]);
  offerSigns([]);
  offerDeities([]);
  offerIngredients([]);
  offerReferences([]);
  offerDuplicates([]);
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <IngredientForm workspaceId={WORKSPACE_ID} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return onSaved;
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

/**
 * RTL's waitFor polled every 5 ms rather than its 50, as index.test.tsx's
 * is: most waits here are for a mock to have been asked (MB.181).
 */
const waitFor: typeof waitForDom = (callback, options) =>
  waitForDom(callback, { interval: 5, ...options });

// Found by label rather than by role and name, so the whole form's tests
// below do not name every element of a role in a 25-field form (MB.181).
const box = () => screen.getByLabelText('Reference', { selector: '[role="combobox"]' });
const references = () => box().closest('fieldset') as HTMLElement;
const rows = () => within(references()).queryAllByRole('listitem');
const row = (citation: string) =>
  rows().find((item) => item.textContent?.includes(citation)) ??
  (() => {
    throw new Error(`No row for ${citation}`);
  })();
const changes = () => within(references()).getByRole('status', { name: 'References changes' });
const panel = () => within(references()).getByRole('group', { name: 'New Reference' });
const noPanel = () =>
  expect(within(references()).queryByRole('group', { name: 'New Reference' })).toBeNull();
const kindBox = () => within(panel()).getByRole('combobox', { name: 'Kind' });
/** A label's text less a required field's asterisk, which is hidden from its name. */
const labelled = (label: string) => (content: string) => content.replace(/\*$/, '') === label;
const inPanel = (label: string) => within(panel()).getByLabelText(labelled(label));
const nameBox = () => screen.getByLabelText(labelled('Name'), { selector: 'input' });
const typeIn = (control: HTMLElement, value: string) =>
  fireEvent.change(control, { target: { value } });
/** Presses a button, focusing it first as a real click would: fireEvent moves no focus. */
const press = (button: HTMLElement) => {
  button.focus();
  fireEvent.click(button);
};
/** The harness's save, or the form's, by name. */
const saveButton = (name = 'Save Ingredient') => {
  const actions = document.querySelector<HTMLElement>('.ingredient-form__actions');
  return (actions ? within(actions) : screen).getByRole('button', { name });
};
const save = () => press(saveButton());
const newReference = () => within(references()).getByRole('button', { name: 'New Reference' });
const chooseKind = (label: string) => {
  fireEvent.click(kindBox());
  fireEvent.click(
    within(screen.getByRole('listbox', { name: 'Kind choices' })).getByRole('option', {
      name: label,
    }),
  );
};

const settle = () => act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
/** Focuses the box, waits for its first, empty ask, then types `text` and lets it settle. */
async function lookUp(calls: unknown[], text: string) {
  act(() => box().focus());
  await waitFor(() => expect(calls).toHaveLength(1));
  typeIn(box(), text);
  settle();
  await waitFor(() => expect(calls).toHaveLength(2));
}
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const option = (citation: string) =>
  screen.findByRole('option', { name: new RegExp(`^${escapeRegExp(citation)}`) });
/** Looks up `text` and picks the source reading `citation` by click. */
async function pick(calls: unknown[], text: string, citation: string) {
  await lookUp(calls, text);
  fireEvent.click(await option(citation));
}
/** Picks HERBAL, then NOTES from the list reopened. */
async function pickBoth(calls: unknown[]) {
  await pick(calls, 'fixture', HERBAL.citation);
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  fireEvent.click(await option(NOTES.citation));
}

describe('ReferencesField', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('the search', () => {
    it('asks about this coven once the box is used, and not before', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      settle();
      expect(calls).toHaveLength(0);

      await lookUp(calls, 'testwort');
      expect(calls[0]).toMatchObject({ workspaceId: WORKSPACE_ID });
      expect(calls[1]).toMatchObject({ workspaceId: WORKSPACE_ID, query: 'testwort' });
    });

    it('offers "Add a reference" first, then each source by its citation and whose it is, in the order found', async () => {
      renderField();
      const calls = offerReferences([NOTES, HERBAL]);

      await lookUp(calls, 'fixture');

      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        'Add a reference',
        `${NOTES.citation}This coven’s source`,
        `${HERBAL.citation}Compendium source`,
      ]);
      expect(screen.queryByRole('option', { name: /Use what you typed/ })).not.toBeInTheDocument();
    });

    it('does not offer a source already listed', async () => {
      renderField();
      const calls = offerReferences([HERBAL, NOTES]);

      await pick(calls, 'fixture', HERBAL.citation);
      fireEvent.keyDown(box(), { key: 'ArrowDown' });

      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
      expect(
        screen.queryByRole('option', { name: new RegExp(escapeRegExp(HERBAL.citation)) }),
      ).toBe(null);
    });
  });

  describe('the list', () => {
    it('adds a picked source as a row beneath the box reading its citation, and announces it', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);

      expect(rows()).toHaveLength(1);
      expect(row(HERBAL.citation)).toBeInTheDocument();
      expect(changes()).toHaveTextContent(HERBAL.citation);
      // The box empties and keeps the focus, for the next one.
      expect(box()).toHaveValue('');
      expect(box()).toHaveFocus();
    });

    it("gives each row a locator, labelled and read with its source's citation and the tip beside it", async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);

      const inRow = within(row(HERBAL.citation));
      const locator = inRow.getByRole('textbox', { name: 'Locator' });
      expect(locator).toHaveAccessibleDescription(expect.stringContaining(HERBAL.citation));
      expect(inRow.getByRole('button', { name: 'About Locator' })).toBeInTheDocument();
    });

    it('removes a row by its ×, keeping the focus in the box, and says so', async () => {
      renderField();
      const calls = offerReferences([HERBAL, NOTES]);

      await pickBoth(calls);
      press(within(references()).getByRole('button', { name: `Remove ${HERBAL.citation}` }));

      expect(rows()).toHaveLength(1);
      expect(row(NOTES.citation)).toBeInTheDocument();
      expect(changes()).toHaveTextContent(HERBAL.citation);
      expect(box()).toHaveFocus();
    });

    it('takes the last row on Backspace in the empty box, as every list does', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);
      const added = changes().textContent ?? '';
      fireEvent.keyDown(box(), { key: 'Backspace' });

      expect(rows()).toHaveLength(0);
      expect(changes()).not.toHaveTextContent(added);
      expect(changes()).toHaveTextContent(HERBAL.citation);
    });

    it('never submits the ingredient on Enter in the box with nothing picked', async () => {
      const onSubmit = renderField();
      offerReferences([]);

      typeIn(box(), 'fixture');
      const enter = fireEvent.keyDown(box(), { key: 'Enter' });

      expect(enter).toBe(false);
      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(onSubmit).not.toHaveBeenCalled();
      expect(rows()).toHaveLength(0);
    });
  });

  describe('what it sends', () => {
    it('tidies a locator as it is left, its ranges dashed, several places in one', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);
      const locator = within(row(HERBAL.citation)).getByRole('textbox', { name: 'Locator' });
      typeIn(locator, ' pp. 12-19,   40; chap. 3 ');
      fireEvent.blur(locator);

      expect(locator).toHaveValue('pp. 12–19, 40; chap. 3');
    });

    it('refuses a save while the box holds a search, until it is cleared', async () => {
      const onSubmit = renderField();
      offerReferences([]);

      typeIn(box(), 'testwort');
      save();

      await waitFor(() => expect(box()).toBeInvalid());
      expect(box()).toHaveAccessibleDescription(expect.stringContaining('testwort'));
      expect(onSubmit).not.toHaveBeenCalled();

      typeIn(box(), '');
      save();
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    });
  });

  describe('the new reference panel', () => {
    // The owner's call: asking again for a panel already open takes you
    // back to it, rather than doing nothing; that the panel then focuses
    // Kind and keeps what was typed is reference-panel.test.tsx's.
    it('opens from New Reference and from the list’s "Add a reference" row, each taking you to Kind', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);
      expect(newReference()).toHaveAttribute('aria-expanded', 'false');

      press(newReference());
      expect(newReference()).toHaveAttribute('aria-expanded', 'true');
      expect(kindBox()).toHaveFocus();

      await lookUp(calls, 'testwort');
      fireEvent.click(await screen.findByRole('option', { name: 'Add a reference' }));
      expect(kindBox()).toHaveFocus();
    });

    it('lists a new source saved to this coven by its id, closing, the box focused', async () => {
      const calls = acceptReference();
      const onSubmit = renderField();
      press(newReference());

      chooseKind('Book');
      typeIn(inPanel('Title'), 'A Fixture Grimoire');
      typeIn(inPanel('Published'), '1999');
      press(within(panel()).getByRole('button', { name: 'Save Reference' }));

      await waitFor(noPanel);
      expect(calls).toHaveLength(1);
      expect(calls[0].workspaceId).toBe(WORKSPACE_ID);
      const citation = 'Mock, Cyril. A Fixture Grimoire. Mockford, 1999.';
      expect(row(citation)).toBeInTheDocument();
      expect(changes()).toHaveTextContent(citation);
      expect(box()).toHaveFocus();

      save();
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].references).toEqual([
        { referenceId: NEW_REFERENCE_ID, locator: '' },
      ]);
    });

    it('closes on Cancel, adding nothing, the focus back in the box', () => {
      const calls = acceptReference();
      renderField();
      press(newReference());

      chooseKind('Book');
      press(within(panel()).getByRole('button', { name: 'Cancel' }));

      noPanel();
      expect(rows()).toHaveLength(0);
      expect(calls).toHaveLength(0);
      expect(box()).toHaveFocus();
    });

    it('stops the ingredient save while it is open, until it is saved or cancelled', async () => {
      const onSubmit = renderField();
      press(newReference());

      save();

      await waitFor(() => expect(box()).toBeInvalid());
      expect(onSubmit).not.toHaveBeenCalled();

      press(within(panel()).getByRole('button', { name: 'Cancel' }));
      save();
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    });
  });

  // What only the whole form does with the field: send its rows through
  // the mutation and clear them for the next ingredient, and route a
  // server's issue on one source to its row.
  describe('on the whole form', () => {
    it('sends each source by its id with its locator as typed, and no citation text, clearing them after Save & Add Another', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerReferences([HERBAL, NOTES]);

      await pickBoth(calls);
      typeIn(within(row(HERBAL.citation)).getByRole('textbox', { name: 'Locator' }), 'p. 112');
      typeIn(nameBox(), 'Testwort');
      press(saveButton('Save & Add Another'));

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.anything(), 'another'));
      expect(saves[0].input.references).toEqual([
        { referenceId: COMPENDIUM_ID, locator: 'p. 112' },
        { referenceId: COVEN_ID, locator: '' },
      ]);
      expect(JSON.stringify(saves[0].input)).not.toContain('Herbal');
      expect(LocalIngredientInput.parse(saves[0].input).references).toEqual([
        { referenceId: COMPENDIUM_ID, locator: 'p. 112' },
        { referenceId: COVEN_ID, locator: null },
      ]);
      await waitFor(() => expect(rows()).toHaveLength(0));
      expect(newReference()).toHaveAttribute('aria-expanded', 'false');
    });

    it('puts a server error naming a source on its row, through the field’s one error element', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['references', 1], message: 'No such source' }],
      });
      renderForm();
      const calls = offerReferences([HERBAL, NOTES]);

      await pickBoth(calls);
      typeIn(nameBox(), 'Testwort');
      save();

      // The error names the source it is about, and that row's × reads it.
      await waitFor(() => expect(box()).toBeInvalid());
      expect(box()).toHaveAccessibleDescription(expect.stringContaining(NOTES.citation));
      expect(
        within(references()).getByRole('button', { name: `Remove ${NOTES.citation}` }),
      ).toHaveAccessibleDescription(/\S/);
      expect(
        within(references()).getByRole('button', { name: `Remove ${HERBAL.citation}` }),
      ).not.toHaveAccessibleDescription();
      expect(box()).toHaveFocus();
    });
  });
});
