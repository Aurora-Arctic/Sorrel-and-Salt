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
import {
  FormField,
  LookupListField,
  useDeitySuggestions,
} from '@/components/IngredientForm/suggestions';
import type {
  IngredientFormInput,
  IngredientFormProps,
  IngredientFormValues,
} from '@/components/IngredientForm/types';
import { EMPTY_VALUES, compendiumResolver } from '@/components/IngredientForm/values';
import type {
  CompendiumSubstitutesQuery,
  CompendiumSubstitutesQueryVariables,
  CreateCompendiumIngredientMutation,
  CreateCompendiumIngredientMutationVariables,
  DeleteCompendiumIngredientMutation,
  DeleteCompendiumIngredientMutationVariables,
  UpdateCompendiumIngredientMutation,
  UpdateCompendiumIngredientMutationVariables,
} from '@/gql/graphql';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';
import {
  offerDeities,
  offerDuplicates,
  offerForms,
  offerNames,
  offerPlanets,
  offerReferences,
  offerSigns,
} from '../../support/msw/ingredient-lookups';

// The form on the compendium (M5.5), and only what the mode changes: written
// with no coven, so every lookup asks with a null `workspaceId`, the
// vocabulary boxes are picked from the curated rows, a substitute is picked
// from the compendium, the classification is required, and an entry given to
// it is edited, saved over and deleted. A pick-only list box on its own is
// list-field.test.tsx's, and what the form does in either mode is
// index.test.tsx's (claude-docs/components/ingredient-form.md, "Testing").

const ENTRY_ID = '3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93';
const OTHER_ID = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const CATEGORY_ID = 'c4a8e2f1-7b3d-4c9e-a6f5-1d2e3f4a5b6c';

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

/** Every lookup answered empty, each one's asks recorded. */
function offerNothing() {
  return {
    forms: offerForms([]),
    names: offerNames([]),
    planets: offerPlanets([]),
    signs: offerSigns([]),
    deities: offerDeities([]),
    compendium: offerCompendium([]),
    references: offerReferences([]),
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

/**
 * The Form box and a pick-only list's box on their own, as the compendium's
 * form wires them, in a form of its own on the compendium's resolver.
 */
function renderPickOnly() {
  const onSubmit = vi.fn();
  const Harness = () => {
    const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
      defaultValues: { ...EMPTY_VALUES, name: 'Testwort', nomenclature: 'none' },
      resolver: compendiumResolver,
    });
    return (
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <FormField workspaceId={null} pickOnly />
          <LookupListField
            workspaceId={null}
            useSuggestions={useDeitySuggestions}
            name="deities"
            ordered
            pickOnly
            legend="Deities"
            entry="Deity"
          />
          <button type="submit">Save Ingredient</button>
        </form>
      </FormProvider>
    );
  };
  offerNothing();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <Harness />
    </QueryClientProvider>,
  );
  return onSubmit;
}

const renderEntry = (values: IngredientFormValues = TESTWORT) =>
  renderForm({ entry: { id: ENTRY_ID, values } });

/**
 * RTL's waitFor polled every 5 ms rather than its 50, as index.test.tsx's
 * is: most waits here are for a mock to have been asked (MB.181).
 */
const waitFor: typeof waitForDom = (callback, options) =>
  waitForDom(callback, { interval: 5, ...options });

// The controls are found by their labels rather than by role and name, as
// index.test.tsx finds them: a role query names every element of the role
// in a 25-field form (MB.181). The required marker, hidden from the name, is
// dropped from the label's text.
const byLabel = (name: string, selector: string) =>
  screen.getByLabelText(name, {
    selector,
    normalizer: (text) => text.replace(/\*$/, '').trim(),
  });
const textbox = (name: string) => byLabel(name, 'input:not([role]), textarea');
const box = (name: string) => byLabel(name, '[role="combobox"]');
const control = (name: string) => byLabel(name, 'input:not([role]), textarea, [role="combobox"]');
const type = (name: string, value: string) =>
  fireEvent.change(control(name), { target: { value } });
/** The row of buttons at the form's foot: the saves, or a question asked in their place. */
const actions = () =>
  within(
    document.querySelector('.ingredient-form__actions, .ingredient-form__confirm') as HTMLElement,
  );
const button = (name: string) => actions().getByRole('button', { name });
const noButton = (name: string) =>
  expect(actions().queryByRole('button', { name })).not.toBeInTheDocument();
const choose = (name: string, label: string) => {
  fireEvent.click(box(name));
  fireEvent.click(
    within(screen.getByRole('listbox', { name: `${name} choices` })).getByRole('option', {
      name: label,
    }),
  );
};
const press = (name: string) => {
  const pressed = button(name);
  pressed.focus();
  fireEvent.click(pressed);
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
    it('marks the classification required, refusing a save without one, then creates a compendium entry with no categories yet, and opens it', async () => {
      const calls = acceptCreate();
      const { onSaved } = renderForm();
      // A new entry keeps Save & Add Another, as a new coven ingredient does.
      expect(button('Save & Add Another')).toBeInTheDocument();

      expect(box('Classification')).toBeRequired();
      type('Name', 'Testwort');
      press('Save Ingredient');

      await waitFor(() => expect(box('Classification')).toBeInvalid());
      expect(calls).toHaveLength(0);

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

    // What the compendium's page gives the form: its dialog's Cancel, and
    // where a near match links, the compendium's edit rather than a coven's
    // ingredient page.
    it('offers Cancel, and links a near match, where the page says', async () => {
      const onCancel = vi.fn();
      renderForm({ onCancel, duplicateHref: (match) => `/admin/compendium?edit=${match.slug}` });
      offerDuplicates([
        { id: OTHER_ID, name: 'Testworts', canonicalName: null, slug: 'testworts' },
      ]);

      type('Name', 'Testwort');
      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));

      expect(await screen.findByRole('link', { name: 'Testworts' })).toHaveAttribute(
        'href',
        '/admin/compendium?edit=testworts',
      );
      fireEvent.click(button('Cancel'));
      expect(onCancel).toHaveBeenCalledOnce();
    });
  });

  describe('the lookups', () => {
    it('ask with a null workspaceId, so they read the compendium alone', async () => {
      renderForm();
      const asks = {
        forms: offerForms([]),
        names: offerNames([]),
        references: offerReferences([]),
        duplicates: offerDuplicates([]),
      };

      type('Name', 'Testwort');
      await search('Form', 'ro');
      // The Form box is the compendium's pick, as the harness below has it.
      expect(
        within(suggestions('Form')).queryByRole('option', { name: /Use what you typed/ }),
      ).toBeNull();
      await search('Folk Name', 'mo');
      await search('Reference', 'fi');

      await waitFor(() => {
        for (const calls of Object.values(asks)) expect(calls.length).toBeGreaterThan(0);
      });
      for (const calls of Object.values(asks)) {
        for (const variables of calls) expect(variables.workspaceId).toBeNull();
      }
    });

    // Every row a pick-only box offers is the compendium's, so a heading
    // saying so tells the admin nothing: the rows are listed flat. A list's
    // pick-only box is list-field.test.tsx's; the Form box's is here.
    it('offer the Form box the curated forms alone, flat, and never the typed text', async () => {
      renderPickOnly();
      offerForms([
        {
          id: OTHER_ID,
          value: 'Root',
          description: null,
          group: 'Plant part',
          curated: true,
          claimants: [],
        },
        {
          id: null,
          value: 'Rootlets',
          description: null,
          group: null,
          curated: false,
          claimants: [],
        },
      ]);

      await search('Form', 'ro');

      const forms = suggestions('Form');
      await waitFor(() => within(forms).getByRole('option', { name: /^Root/ }));
      expect(within(forms).getAllByRole('option')).toHaveLength(1);
      expect(within(forms).queryByRole('group')).not.toBeInTheDocument();
    });

    it('hold a save while a pick-only box holds text, and refuse a form typed rather than picked', async () => {
      const onSubmit = renderPickOnly();

      type('Form', 'Root');
      type('Deity', 'Mockate');
      fireEvent.click(screen.getByRole('button', { name: 'Save Ingredient' }));

      await waitFor(() => expect(box('Deity')).toBeInvalid());
      expect(box('Deity')).toHaveAccessibleDescription(expect.stringContaining('Mockate'));
      expect(box('Form')).toBeInvalid();
      expect(onSubmit).not.toHaveBeenCalled();
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
    it('shows its values, offers one save, off until something changes, and saves over it, carrying its categories through untouched', async () => {
      const calls = acceptUpdate();
      const { onSaved } = renderEntry();

      expect(textbox('Name')).toHaveValue('Testwort');
      expect(textbox('Formal Name')).toHaveValue('Fixtura testalis');
      expect(screen.getByLabelText('Remove Mockury', { selector: 'button' })).toBeInTheDocument();
      noButton('Save & Add Another');
      expect(button('Save Ingredient')).toBeDisabled();

      type('Name', 'Mockwort');
      expect(button('Save Ingredient')).toBeEnabled();
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

    it('asks before ending another entry’s redirect, sending nothing on Keep It, and again once confirmed', async () => {
      const message =
        '"mockwort-fixtura-testalis" redirects to "Mockwort" (Fixtura vulgaris, root) until 4 April 2027, 00:00 UTC — confirm to end that redirect';
      mockGraphQLError('UpdateCompendiumIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['endRedirect'], message }],
      });
      renderEntry();

      type('Name', 'Mockwort');
      press('Save Ingredient');
      await waitFor(() => button('Keep It'));
      fireEvent.click(button('Keep It'));

      noButton('End Redirect & Save');
      expect(button('Save Ingredient')).toBeEnabled();

      press('Save Ingredient');
      await waitFor(() => button('End Redirect & Save'));
      const calls = acceptUpdate();
      fireEvent.click(button('End Redirect & Save'));

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toMatchObject({ id: ENTRY_ID, endRedirect: true });
    });

    it('deletes it once confirmed, keeping it on Keep It, and says why when the delete is refused', async () => {
      const { onDeleted } = renderEntry();

      fireEvent.click(button('Delete Ingredient'));
      expect(button('Delete')).toBeVisible();
      expect(screen.getByText(/Testwort/)).toBeInTheDocument();
      fireEvent.click(button('Keep It'));
      noButton('Delete');

      mockGraphQLError('DeleteCompendiumIngredient', {
        code: 'NOT_FOUND',
        message: 'No such compendium entry',
      });
      fireEvent.click(button('Delete Ingredient'));
      fireEvent.click(button('Delete'));

      expect(await screen.findByRole('alert')).toBeVisible();
      expect(onDeleted).not.toHaveBeenCalled();

      const calls = acceptDelete();
      fireEvent.click(button('Delete Ingredient'));
      fireEvent.click(button('Delete'));

      await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
      expect(calls).toEqual([{ id: ENTRY_ID }]);
    });
  });
});
