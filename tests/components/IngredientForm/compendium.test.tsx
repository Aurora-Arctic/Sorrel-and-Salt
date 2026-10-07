import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import type { IngredientFormProps, IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import type {
  CompendiumSubstitutesQuery,
  CompendiumSubstitutesQueryVariables,
  CreateCompendiumIngredientMutation,
  CreateCompendiumIngredientMutationVariables,
  DeleteCompendiumIngredientMutation,
  DeleteCompendiumIngredientMutationVariables,
  PlanetSuggestionsQueryVariables,
  UpdateCompendiumIngredientMutation,
  UpdateCompendiumIngredientMutationVariables,
} from '@/gql/graphql';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';
import type { CategoryNode, CorrespondenceNode, DeityNode, DuplicateNode, FormNode } from './types';

// The form on the compendium (M5.5): written with no coven, so every lookup
// asks with a null `workspaceId`, the vocabulary boxes offer the curated rows
// alone, a substitute is picked from the compendium, the classification is
// required, and an entry given to it is edited, saved over and deleted
// (claude-docs/components/ingredient-form.md, "On the compendium").

const ENTRY_ID = '3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93';
const OTHER_ID = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const CATEGORY_ID = 'c4a8e2f1-7b3d-4c9e-a6f5-1d2e3f4a5b6c';

/** Answers a lookup with these rows, recording the variables of each ask. */
function offer<N>(operation: string, field: string, nodes: N[]) {
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

const offerForms = (nodes: FormNode[]) => offer('FormSuggestions', 'formSuggestions', nodes);
const offerPlanets = (nodes: CorrespondenceNode[]) =>
  offer('PlanetSuggestions', 'planetSuggestions', nodes);
const offerDeities = (nodes: DeityNode[]) => offer('DeitySuggestions', 'deitySuggestions', nodes);
const offerDuplicates = (nodes: DuplicateNode[]) =>
  offer('PossibleDuplicates', 'possibleDuplicates', nodes);

/** Answers the substitutes' `compendium(query)` with these entries, recording each ask. */
function offerCompendium(
  nodes: CompendiumSubstitutesQuery['compendium']['edges'][number]['node'][],
) {
  const calls: CompendiumSubstitutesQueryVariables[] = [];
  mockGraphQLQuery<CompendiumSubstitutesQuery, CompendiumSubstitutesQueryVariables>(
    'CompendiumSubstitutes',
    (variables) => {
      calls.push(variables);
      return { compendium: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

/** Answers the picker's `PickerCategories` with these rows, the one page it reads. */
function offerCategories(nodes: CategoryNode[]) {
  mockGraphQLQuery<Record<string, unknown>>('PickerCategories', () => ({
    categories: { edges: nodes.map((node) => ({ node })) },
  }));
}

/** Every lookup answered empty, each one's asks recorded. */
function offerNothing() {
  return {
    forms: offerForms([]),
    names: offer('CommonNameSuggestions', 'commonNameSuggestions', []),
    planets: offerPlanets([]),
    signs: offer('ZodiacSuggestions', 'zodiacSuggestions', []),
    deities: offerDeities([]),
    compendium: offerCompendium([]),
    references: offer('ReferenceSuggestions', 'referenceSuggestions', []),
    duplicates: offerDuplicates([]),
  };
}

/** Testwort as an entry the form edits: a planet listed and a category filed. */
const TESTWORT: IngredientFormValues = {
  ...EMPTY_VALUES,
  name: 'Testwort',
  nomenclature: 'botanical',
  canonicalName: 'Fixtura testalis',
  planets: [{ value: 'Mockury' }],
  categoryIds: [CATEGORY_ID],
};

function renderForm(props: Partial<Extract<IngredientFormProps, { workspaceId: null }>> = {}) {
  const onSaved = vi.fn();
  const onDeleted = vi.fn();
  const asks = offerNothing();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <IngredientForm workspaceId={null} onSaved={onSaved} onDeleted={onDeleted} {...props} />
    </QueryClientProvider>,
  );
  return { onSaved, onDeleted, asks };
}

const renderEntry = (values: IngredientFormValues = TESTWORT) =>
  renderForm({ entry: { id: ENTRY_ID, values } });

const textbox = (name: string) => screen.getByRole('textbox', { name });
const box = (name: string) => screen.getByRole('combobox', { name });
const control = (name: string) =>
  screen.queryByRole('textbox', { name }) ?? screen.getByRole('combobox', { name });
const type = (name: string, value: string) =>
  fireEvent.change(control(name), { target: { value } });
const choose = (name: string, label: string) => {
  fireEvent.click(box(name));
  fireEvent.click(
    within(screen.getByRole('listbox', { name: `${name} choices` })).getByRole('option', {
      name: label,
    }),
  );
};
const press = (name: string) => {
  const button = screen.getByRole('button', { name });
  button.focus();
  fireEvent.click(button);
};
/** Focuses a box, types into it, and lets the debounce settle so its lookup asks. */
async function search(name: string, text: string) {
  act(() => box(name).focus());
  type(name, text);
  await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
}
const suggestions = (name: string) => screen.getByRole('listbox', { name: `${name} suggestions` });

function acceptCreate() {
  const calls: CreateCompendiumIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    CreateCompendiumIngredientMutation,
    CreateCompendiumIngredientMutationVariables
  >('CreateCompendiumIngredient', (variables) => {
    calls.push(variables);
    return {
      createCompendiumIngredient: {
        id: ENTRY_ID,
        name: variables.input.name,
        slug: 'testwort-fixtura-testalis',
      },
    };
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
      updateCompendiumIngredient: {
        id: String(variables.id),
        name: variables.input.name,
        slug: 'mockwort-fixtura-testalis',
      },
    };
  });
  return calls;
}

function acceptDelete() {
  const calls: DeleteCompendiumIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    DeleteCompendiumIngredientMutation,
    DeleteCompendiumIngredientMutationVariables
  >('DeleteCompendiumIngredient', (variables) => {
    calls.push(variables);
    return { deleteCompendiumIngredient: String(variables.id) };
  });
  return calls;
}

describe('IngredientForm on the compendium', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('a new entry', () => {
    it('marks the classification required, and refuses a save without one', async () => {
      const calls = acceptCreate();
      renderForm();

      expect(box('Classification')).toBeRequired();
      type('Name', 'Testwort');
      press('Save Ingredient');

      await waitFor(() =>
        expect(box('Classification')).toHaveAccessibleDescription(
          expect.stringContaining('Choose a classification'),
        ),
      );
      expect(calls).toHaveLength(0);
    });

    it('creates a compendium entry, with no categories yet, and opens it', async () => {
      const calls = acceptCreate();
      const { onSaved } = renderForm();

      type('Name', 'Testwort');
      choose('Classification', 'None');
      press('Save Ingredient');

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toMatchObject({
        input: { name: 'Testwort', nomenclature: 'none', categoryIds: [] },
      });
      expect(calls[0]).not.toHaveProperty('workspaceId');
      expect(onSaved).toHaveBeenCalledWith(
        { id: ENTRY_ID, name: 'Testwort', slug: 'testwort-fixtura-testalis' },
        'open',
      );
    });

    it('keeps Save & Add Another, as a new coven ingredient does', () => {
      renderForm();
      expect(screen.getByRole('button', { name: 'Save & Add Another' })).toBeInTheDocument();
    });

    it('offers Cancel when the page gives it one', () => {
      const onCancel = vi.fn();
      renderForm({ onCancel });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('links a near match where the page says', async () => {
      renderForm({ duplicateHref: (match) => `/admin/compendium?edit=${match.slug}` });
      offerDuplicates([
        { id: OTHER_ID, name: 'Testworts', canonicalName: null, slug: 'testworts' },
      ]);

      type('Name', 'Testwort');
      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));

      expect(await screen.findByRole('link', { name: 'Testworts' })).toHaveAttribute(
        'href',
        '/admin/compendium?edit=testworts',
      );
    });
  });

  describe('the lookups', () => {
    it('ask with a null workspaceId, so they read the compendium alone', async () => {
      renderForm();
      const asks = {
        forms: offerForms([]),
        names: offer('CommonNameSuggestions', 'commonNameSuggestions', []),
        references: offer('ReferenceSuggestions', 'referenceSuggestions', []),
        duplicates: offerDuplicates([]),
      };

      type('Name', 'Testwort');
      await search('Form', 'ro');
      await search('Folk Name', 'mo');
      await search('Reference', 'fi');

      await waitFor(() => {
        for (const calls of Object.values(asks)) expect(calls.length).toBeGreaterThan(0);
      });
      for (const calls of Object.values(asks)) {
        for (const variables of calls) expect(variables.workspaceId).toBeNull();
      }
    });

    it('offer only the curated rows in the vocabulary boxes, and never the typed text', async () => {
      renderForm();
      offerPlanets([
        { value: 'Mockury', description: 'A fixture planet.', curated: true },
        { value: 'Mockturn', description: null, curated: false },
      ]);

      await search('Planet', 'Mock');

      const list = suggestions('Planet');
      await waitFor(() => within(list).getByRole('option', { name: /Mockury/ }));
      expect(within(list).queryByRole('option', { name: /Mockturn/ })).not.toBeInTheDocument();
      expect(within(list).queryByRole('option', { name: /Use "Mock"/ })).not.toBeInTheDocument();
    });

    // Every row a pick-only box offers is the compendium's, so a heading
    // saying so tells the admin nothing: the rows are listed flat.
    it('list the vocabulary boxes flat, under no From Compendium heading', async () => {
      renderForm();
      offerPlanets([{ value: 'Mockury', description: 'A fixture planet.', curated: true }]);
      offerForms([
        {
          id: OTHER_ID,
          value: 'Root',
          description: null,
          group: 'Plant part',
          curated: true,
          claimants: [],
        },
      ]);

      await search('Planet', 'Mock');
      const planets = suggestions('Planet');
      await waitFor(() => within(planets).getByRole('option', { name: /Mockury/ }));
      expect(within(planets).queryByRole('group')).not.toBeInTheDocument();

      await search('Form', 'ro');
      const forms = suggestions('Form');
      await waitFor(() => within(forms).getByRole('option', { name: /Root/ }));
      expect(within(forms).queryByRole('group')).not.toBeInTheDocument();
    });

    it('add a planet, sign or deity only by a pick: no Add button', () => {
      renderForm();
      for (const entry of ['Planet', 'Zodiac Sign', 'Deity']) {
        expect(screen.queryByRole('button', { name: `Add ${entry}` })).not.toBeInTheDocument();
      }
      // Folk names and colours have no curated list (MB.162), and keep theirs.
      expect(screen.getByRole('button', { name: 'Add Folk Name' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Colour' })).toBeInTheDocument();
    });

    it('refuse Enter on text not picked, keeping it to search on', () => {
      renderForm();

      type('Planet', 'Mockury');
      fireEvent.keyDown(box('Planet'), { key: 'Enter' });

      expect(box('Planet')).toHaveValue('Mockury');
      expect(box('Planet')).toHaveAccessibleDescription(
        expect.stringContaining('Pick "Mockury" from the list'),
      );
      expect(screen.queryByRole('button', { name: 'Remove Mockury' })).not.toBeInTheDocument();
    });

    it('hold a save while a pick-only box holds text', async () => {
      const calls = acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      choose('Classification', 'None');
      type('Deity', 'Mockate');
      press('Save Ingredient');

      await waitFor(() =>
        expect(box('Deity')).toHaveAccessibleDescription(
          expect.stringContaining('Pick "Mockate" from the list, or clear the box'),
        ),
      );
      expect(calls).toHaveLength(0);
    });

    it('refuse a form typed rather than picked', async () => {
      const calls = acceptCreate();
      renderForm();

      type('Name', 'Testwort');
      choose('Classification', 'None');
      type('Form', 'Root');
      press('Save Ingredient');

      await waitFor(() =>
        expect(box('Form')).toHaveAccessibleDescription(
          expect.stringContaining('Pick a form from the list'),
        ),
      );
      expect(calls).toHaveLength(0);
    });

    it('suggest substitutes from the compendium, leaving out the entry itself', async () => {
      renderEntry();
      const asks = offerCompendium([
        {
          id: ENTRY_ID,
          name: 'Testwort',
          canonicalName: 'Fixtura testalis',
          form: null,
          description: null,
          isGlobal: true,
        },
        {
          id: OTHER_ID,
          name: 'Mockwort',
          canonicalName: 'Fixtura vulgaris',
          form: 'root',
          description: null,
          isGlobal: true,
        },
      ]);

      await search('Substitute Ingredient', 'wort');

      const list = suggestions('Substitute Ingredient');
      await waitFor(() => within(list).getByRole('option', { name: /Mockwort/ }));
      expect(within(list).queryByRole('option', { name: /Testwort/ })).not.toBeInTheDocument();
      expect(asks[asks.length - 1]).toMatchObject({ query: 'wort' });
    });
  });

  describe('an entry given to it', () => {
    it('shows its values, and offers one save, off until something changes', () => {
      renderEntry();

      expect(textbox('Name')).toHaveValue('Testwort');
      expect(textbox('Formal Name')).toHaveValue('Fixtura testalis');
      expect(screen.getByRole('button', { name: 'Remove Mockury' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save & Add Another' })).not.toBeInTheDocument();

      const saveButton = screen.getByRole('button', { name: 'Save Ingredient' });
      expect(saveButton).toBeDisabled();
      type('Name', 'Mockwort');
      expect(saveButton).toBeEnabled();
    });

    it('saves over it, carrying its categories through untouched', async () => {
      const calls = acceptUpdate();
      const { onSaved } = renderEntry();

      type('Name', 'Mockwort');
      press('Save Ingredient');

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toMatchObject({
        id: ENTRY_ID,
        input: {
          name: 'Mockwort',
          nomenclature: 'botanical',
          canonicalName: 'Fixtura testalis',
          planets: ['Mockury'],
          categoryIds: [CATEGORY_ID],
        },
      });
      expect(calls[0]?.endRedirect).toBeFalsy();
      expect(onSaved).toHaveBeenCalledWith(
        { id: ENTRY_ID, name: 'Mockwort', slug: 'mockwort-fixtura-testalis' },
        'open',
      );
    });

    // Story 18 through MB.126's picker: the entry's categories shown picked,
    // and a pick added beside them saved with the rest.
    it('shows its categories picked, and saves one picked beside them', async () => {
      const colours = { colorDark: '#9fd3a8', colorLight: '#1f5130' };
      const wards = { id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', name: 'Wards', ...colours };
      offerCategories([
        { id: CATEGORY_ID, name: 'Testward', description: 'Wards a test.', group: wards },
        { id: OTHER_ID, name: 'Fixture Shield', description: 'Turns a test aside.', group: wards },
      ]);
      const calls = acceptUpdate();
      renderEntry();

      expect(await screen.findByRole('button', { name: 'Remove Testward' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
      fireEvent.click(await screen.findByRole('option', { name: /^Fixture Shield/ }));
      press('Save Ingredient');

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]?.input.categoryIds).toEqual([CATEGORY_ID, OTHER_ID]);
    });

    it('warns of near matches other than itself', async () => {
      renderEntry();
      offerDuplicates([
        {
          id: ENTRY_ID,
          name: 'Testwort',
          canonicalName: 'Fixtura testalis',
          slug: 'testwort-fixtura-testalis',
        },
        { id: OTHER_ID, name: 'Testworts', canonicalName: null, slug: 'testworts' },
      ]);

      type('Name', 'Testworth');
      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));

      const warning = screen.getByRole('status', { name: 'Possible duplicates' });
      await waitFor(() => within(warning).getByRole('link', { name: 'Testworts' }));
      expect(within(warning).queryByRole('link', { name: /Testwort \(/ })).not.toBeInTheDocument();
    });

    it('asks before ending another entry’s redirect, and sends again once confirmed', async () => {
      const message =
        '"mockwort-fixtura-testalis" redirects to "Mockwort" (Fixtura vulgaris, root) until 4 April 2027, 00:00 UTC — confirm to end that redirect';
      mockGraphQLError('UpdateCompendiumIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['endRedirect'], message }],
      });
      renderEntry();

      type('Name', 'Mockwort');
      press('Save Ingredient');

      const confirm = await screen.findByRole('button', { name: 'End Redirect & Save' });
      expect(screen.getByText(message)).toBeInTheDocument();

      const calls = acceptUpdate();
      fireEvent.click(confirm);

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toMatchObject({ id: ENTRY_ID, endRedirect: true });
    });

    it('drops the question on Keep It, sending nothing', async () => {
      mockGraphQLError('UpdateCompendiumIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['endRedirect'], message: 'confirm to end that redirect' }],
      });
      renderEntry();

      type('Name', 'Mockwort');
      press('Save Ingredient');
      fireEvent.click(await screen.findByRole('button', { name: 'Keep It' }));

      expect(screen.queryByRole('button', { name: 'End Redirect & Save' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Ingredient' })).toBeEnabled();
    });

    it('deletes it once confirmed', async () => {
      const calls = acceptDelete();
      const { onDeleted } = renderEntry();

      fireEvent.click(screen.getByRole('button', { name: 'Delete Ingredient' }));
      expect(screen.getByText(/Delete "Testwort"\?/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
      expect(calls).toEqual([{ id: ENTRY_ID }]);
    });

    it('keeps it on Keep It, and says why when the delete is refused', async () => {
      const { onDeleted } = renderEntry();

      fireEvent.click(screen.getByRole('button', { name: 'Delete Ingredient' }));
      fireEvent.click(screen.getByRole('button', { name: 'Keep It' }));
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

      mockGraphQLError('DeleteCompendiumIngredient', {
        code: 'NOT_FOUND',
        message: 'No such compendium entry',
      });
      fireEvent.click(screen.getByRole('button', { name: 'Delete Ingredient' }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('No such compendium entry');
      expect(onDeleted).not.toHaveBeenCalled();
    });
  });
});
