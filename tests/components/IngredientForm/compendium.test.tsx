import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import { COMPENDIUM_EDIT_NOTICE } from '@/components/IngredientForm/compendium-notice';
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
import {
  EMPTY_VALUES,
  EMPTY_VARIANT,
  compendiumResolver,
} from '@/components/IngredientForm/values';
import type {
  DeleteCompendiumIngredientMutation,
  DeleteCompendiumIngredientMutationVariables,
  SetCompendiumEntryReviewedMutation,
  SetCompendiumEntryReviewedMutationVariables,
} from '@/gql/graphql';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import {
  expectAnswered,
  expectAskingOver,
  expectGuardedWaysOut,
  renderInModal,
} from '../../support/discard-guard';
import {
  box,
  chooseKind,
  inPanel,
  referencePanel,
  renderWithClient,
  textbox,
  waitFor,
  duplicateHref,
} from '../../support/ingredient-form';
import { openSections } from '../../support/ingredient-sections';
import { choose, press, type, typeIn } from '../../support/interact';
import {
  ENTRY_ID,
  acceptCompendiumCreate,
  acceptUpdate,
  offerCompendium,
  offerDuplicates,
  offerEntryUsers,
  offerForms,
  offerNames,
  offerNothing,
  offerReferences,
} from '../../support/msw/ingredient-lookups';

// The form on the compendium, and only what the mode changes: written with no coven, so every lookup asks with a null `workspaceId`, the vocabulary boxes are picked from the curated rows,
// a substitute is picked from the compendium, the classification is required, and an entry given to it is edited, saved over and deleted.
// A pick-only list box on its own is list-field.test.tsx's, and what the form does in either mode is index.test.tsx's (claude-docs/components/ingredient-form.md, "Testing").

const OTHER_ID = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const CATEGORY_ID = 'c4a8e2f1-7b3d-4c9e-a6f5-1d2e3f4a5b6c';

/** Testwort as an entry the form edits: a celestial body listed and a category filed. */
const TESTWORT: IngredientFormValues = {
  ...EMPTY_VALUES,
  name: 'Testwort',
  nomenclature: 'botanical',
  canonicalName: 'Fixtura testalis',
  celestialBodies: [{ value: 'Mockury' }],
  categoryIds: [CATEGORY_ID],
};

function renderForm(props: Partial<Extract<IngredientFormProps, { workspaceId: null }>> = {}) {
  const onSaved = vi.fn();
  const onDeleted = vi.fn();
  const asks = offerNothing();
  renderWithClient(
    <IngredientForm
      duplicateHref={duplicateHref}
      workspaceId={null}
      onSaved={onSaved}
      onDeleted={onDeleted}
      {...props}
    />,
  );
  return { onSaved, onDeleted, asks };
}

/** A variant's Form box and a pick-only list's box on their own, as the compendium's form wires them, in a form of its own on the compendium's resolver. */
function renderPickOnly() {
  const onSubmit = vi.fn();
  const Harness = () => {
    const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
      defaultValues: {
        ...EMPTY_VALUES,
        name: 'Testwort',
        nomenclature: 'none',
        variants: [EMPTY_VARIANT],
      },
      resolver: compendiumResolver,
    });
    return (
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <FormField workspaceId={null} at="variants.0" pickOnly />
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
  renderWithClient(<Harness />);
  return onSubmit;
}

const renderEntry = (values: IngredientFormValues = TESTWORT) =>
  renderForm({ entry: { id: ENTRY_ID, values } });

/** A button at the form's foot, a save or a question's answer, by its role and name. */
const button = (name: string) => screen.getByRole('button', { name });
const noButton = (name: string) =>
  expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
/** Focuses a box, types into it, and lets the debounce settle so its lookup asks. */
async function search(name: string, text: string) {
  act(() => box(name).focus());
  type(name, text);
  await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
}
const suggestions = (name: string) => screen.getByRole('listbox', { name: `${name} suggestions` });

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
      const calls = acceptCompendiumCreate();
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

    // What the compendium's page gives the form: where a near match links,
    // the compendium's edit rather than a coven's ingredient page. Its Cancel
    // is the discard guard's case below.
    it('links a near match where the page says', async () => {
      renderForm({ duplicateHref: (match) => `/admin/compendium?edit=${match.slug}` });
      offerDuplicates([
        { id: OTHER_ID, name: 'Testworts', canonicalName: null, slug: 'testworts' },
      ]);

      type('Name', 'Testwort');
      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));

      expect(await screen.findByRole('link', { name: /^Testworts/ })).toHaveAttribute(
        'href',
        '/admin/compendium?edit=testworts',
      );
    });

    // Regression: an entry whose substitute links an ingredient in forms, with none chosen, opened as the readback gives it, its Form of X box registering a key the values lacked.
    // React's development double mount then counted the untouched entry changed, and Cancel asked.
    it('closes an untouched entry at once whose substitute links an ingredient with no form chosen', () => {
      offerNothing();
      const values: IngredientFormValues = {
        ...TESTWORT,
        substitutes: [
          {
            value: 'Mockleaf',
            link: {
              id: OTHER_ID,
              canonicalName: null,
              forms: ['Oil'],
              description: null,
              isGlobal: true,
              variants: [{ id: '5d6e7f8a-9b0c-4d1e-8f2a-3b4c5d6e7f8a', form: 'Oil', group: null }],
            },
          },
        ],
      };
      const onClose = renderInModal(
        (done) => (
          <IngredientForm
            duplicateHref={duplicateHref}
            workspaceId={null}
            entry={{ id: ENTRY_ID, values }}
            onSaved={vi.fn()}
            onDeleted={done}
            onCancel={done}
          />
        ),
        { strict: true },
      );

      expect(screen.getByRole('button', { name: 'Save Ingredient' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('button', { name: 'Discard Changes' })).not.toBeInTheDocument();
      expect(onClose).toHaveBeenCalledOnce();
    });

    // Every way out asks first while the form has changes: the
    // guard's shape is tests/components/Modal's, and this its wiring.
    it('asks before Cancel or Escape discards a change, and closes on Discard Changes', async () => {
      offerNothing();
      const onClose = renderInModal((done) => (
        <IngredientForm
          duplicateHref={duplicateHref}
          workspaceId={null}
          onSaved={vi.fn()}
          onDeleted={done}
          onCancel={done}
        />
      ));

      expectGuardedWaysOut(onClose, () => type('Name', 'Testwort'));
      // Each way out leaves Name, which validates it after the press.
      await act(async () => {});
    });

    // A reference panel's edits are in a form of their own, which the
    // ingredient form's isDirty never sees; they count all the same.
    it('asks before Escape or Cancel discards what is typed in a reference panel, keeping it on Keep Editing', async () => {
      offerNothing();
      const onClose = renderInModal((done) => (
        <IngredientForm
          duplicateHref={duplicateHref}
          workspaceId={null}
          onSaved={vi.fn()}
          onDeleted={done}
          onCancel={done}
        />
      ));
      const title = () => inPanel('Title');

      expectGuardedWaysOut(
        onClose,
        () => {
          fireEvent.keyDown(box('Reference'), { key: 'ArrowDown' });
          fireEvent.click(screen.getByRole('option', { name: 'New Reference' }));
          chooseKind('Book');
          typeIn(title(), 'A Fixture Grimoire');
        },
        {
          // The form's own Cancel, not the panel's.
          cancel: () =>
            screen
              .getAllByRole('button', { name: 'Cancel' })
              .find((cancel) => !referencePanel().contains(cancel)) as HTMLElement,
          kept: () => expect(title()).toHaveValue('A Fixture Grimoire'),
        },
      );
      // Leaving a field validates it, a step that ends after the assertions.
      await act(async () => {});
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
      await search('New Form', 'ro');
      // A form is the compendium's pick, as the harness below has it. The
      // list is in the document only once the lookup has settled (its "no
      // matches" message), a tick after the debounce, so it is awaited.
      expect(
        within(await screen.findByRole('listbox', { name: 'New Form suggestions' })).queryByRole(
          'option',
          { name: /Use what you typed/ },
        ),
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
          icon: null,
          curated: true,
          claimants: [],
        },
        {
          id: null,
          value: 'Rootlets',
          description: null,
          group: null,
          icon: null,
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

    // A variant's form typed rather than picked is variants.test.tsx's.
    it('hold a save while a pick-only box holds text', async () => {
      const onSubmit = renderPickOnly();

      type('Deity', 'Mockate');
      fireEvent.click(screen.getByRole('button', { name: 'Save Ingredient' }));

      await waitFor(() => expect(box('Deity')).toBeInvalid());
      expect(box('Deity')).toHaveAccessibleDescription(expect.stringContaining('Mockate'));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('suggest substitutes from the compendium, leaving out the entry itself', async () => {
      renderEntry();
      const asks = offerCompendium([
        {
          id: ENTRY_ID,
          name: 'Testwort',
          canonicalName: 'Fixtura testalis',
          description: null,
          isGlobal: true,
          variants: [],
        },
        {
          id: OTHER_ID,
          name: 'Mockwort',
          canonicalName: 'Fixtura vulgaris',
          description: null,
          isGlobal: true,
          variants: [
            { id: '5b6c7d8e-9f0a-4b1c-8d2e-3f4a5b6c7d8e', form: 'Root', formChoice: null },
          ],
        },
      ]);
      openSections('Relations');

      await search('Substitute Ingredient', 'wort');

      const list = suggestions('Substitute Ingredient');
      await waitFor(() => within(list).getByRole('option', { name: /Mockwort/ }));
      expect(within(list).queryByRole('option', { name: /Testwort/ })).not.toBeInTheDocument();
      expect(asks[asks.length - 1]).toMatchObject({ query: 'wort' });
    });
  });

  describe('an entry given to it', () => {
    // An edit of the compendium says so at its head, as an add, which
    // writes nothing yet anyone reads, does not.
    it('says that it edits the compendium, as a new entry does not', () => {
      renderForm();
      expect(screen.queryByText(COMPENDIUM_EDIT_NOTICE)).not.toBeInTheDocument();
      cleanup();

      renderEntry();
      expect(screen.getByText(COMPENDIUM_EDIT_NOTICE)).toBeInTheDocument();
    });

    // The Reviewed switch is a field of the form, offered by the page to a
    // curator or admin: Save carries it, Cancel drops it, and it never saves on its own.
    describe('the Reviewed switch', () => {
      const reviewSwitch = () => screen.getByRole('switch', { name: 'Reviewed' });
      const noSwitch = () => expect(screen.queryByRole('switch', { name: 'Reviewed' })).toBeNull();
      const REVIEW_ID = ENTRY_ID;

      function acceptReview() {
        const calls: SetCompendiumEntryReviewedMutationVariables[] = [];
        mockGraphQLMutation<
          SetCompendiumEntryReviewedMutation,
          SetCompendiumEntryReviewedMutationVariables
        >('SetCompendiumEntryReviewed', (variables) => {
          calls.push(variables);
          return { setCompendiumEntryReviewed: { id: String(variables.id) } };
        });
        return calls;
      }

      it('is offered on an add and on an edit when the page gives it, and on neither when it does not', () => {
        renderForm();
        noSwitch();
        cleanup();

        renderEntry();
        noSwitch();
        cleanup();

        renderForm({ review: { reviewed: false } });
        expect(reviewSwitch()).not.toBeChecked();
        cleanup();

        renderForm({
          entry: { id: ENTRY_ID, values: TESTWORT },
          review: { reviewed: true },
        });
        expect(reviewSwitch()).toBeChecked();
      });

      // Regression: with every section closed on an edit, the switch was the first shown field, so
      // the modal opened with the focus on it at the form's foot rather than on the dialog.
      it('leaves the focus off the switch as the modal opens on an edit', async () => {
        offerNothing();
        renderInModal(() => (
          <IngredientForm
            duplicateHref={duplicateHref}
            workspaceId={null}
            entry={{ id: ENTRY_ID, values: TESTWORT }}
            review={{ reviewed: false }}
          />
        ));
        await act(async () => {});

        expect(reviewSwitch()).not.toHaveFocus();
        expect(screen.getByRole('dialog')).toHaveFocus();
      });

      it('makes the form changed when flipped, without saving anything', async () => {
        const review = acceptReview();
        const saves = acceptUpdate();
        renderForm({ entry: { id: ENTRY_ID, values: TESTWORT }, review: { reviewed: false } });
        expect(button('Save Ingredient')).toBeDisabled();

        fireEvent.click(reviewSwitch());

        expect(reviewSwitch()).toBeChecked();
        expect(button('Save Ingredient')).toBeEnabled();
        await act(async () => {});
        expect(review).toHaveLength(0);
        expect(saves).toHaveLength(0);
      });

      it('is sent with Save after the edit, for the entry it edited', async () => {
        const review = acceptReview();
        const saves = acceptUpdate();
        renderForm({ entry: { id: ENTRY_ID, values: TESTWORT }, review: { reviewed: false } });

        fireEvent.click(reviewSwitch());
        press('Save Ingredient');

        await waitFor(() => expect(review).toHaveLength(1));
        expect(saves).toHaveLength(1);
        expect(review[0]).toEqual({ id: REVIEW_ID, reviewed: true });
        // Saved, so nothing is left to save until it changes again.
        await waitFor(() => expect(button('Save Ingredient')).toBeDisabled());
      });

      it('is sent with the create of a new entry, for the id the create answered with', async () => {
        const review = acceptReview();
        const creates = acceptCompendiumCreate();
        renderForm({ review: { reviewed: false } });

        type('Name', 'Testwort');
        choose('Classification', 'None');
        fireEvent.click(reviewSwitch());
        press('Save Ingredient');

        await waitFor(() => expect(review).toHaveLength(1));
        expect(creates).toHaveLength(1);
        expect(review[0]).toEqual({ id: REVIEW_ID, reviewed: true });
      });

      it('is not sent when it was left as the page had it', async () => {
        const review = acceptReview();
        const saves = acceptUpdate();
        const { onSaved } = renderForm({
          entry: { id: ENTRY_ID, values: TESTWORT },
          review: { reviewed: true },
        });

        type('Name', 'Mockwort');
        press('Save Ingredient');

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(saves).toHaveLength(1);
        expect(review).toHaveLength(0);
      });

      it('is dropped by Cancel, which asks first because the switch changed the form', async () => {
        const review = acceptReview();
        offerNothing();
        const onClose = renderInModal((done) => (
          <IngredientForm
            duplicateHref={duplicateHref}
            workspaceId={null}
            entry={{ id: ENTRY_ID, values: TESTWORT }}
            review={{ reviewed: false }}
            onSaved={vi.fn()}
            onDeleted={done}
            onCancel={done}
          />
        ));

        fireEvent.click(reviewSwitch());
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Discard Changes' }));
        expect(onClose).toHaveBeenCalledOnce();
        await act(async () => {});
        expect(review).toHaveLength(0);
      });
    });

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
          celestialBodies: ['Mockury'],
          categoryIds: [CATEGORY_ID],
        },
      });
      expect(calls[0]?.endRedirect).toBeFalsy();
      expect(onSaved).toHaveBeenCalledWith(
        { id: ENTRY_ID, name: 'Mockwort', slug: 'mockwort-fixtura-testalis' },
        'open',
      );
    });

    // An edit renames what exists rather than making another, so a near
    // match warns and holds nothing, and the entry
    // is never its own near match.
    it('saves a rename near another entry at once, the match named but not itself, and nothing to set aside', async () => {
      const calls = acceptUpdate();
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
      openSections('Identity');

      type('Name', 'Testworth');
      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      const warning = screen.getByRole('status', { name: 'Possible duplicates' });
      await waitFor(() => within(warning).getByRole('link', { name: /^Testworts/ }));
      expect(within(warning).queryByRole('link', { name: /Testwort \(/ })).not.toBeInTheDocument();
      noButton('Create Anyway');

      press('Save Ingredient');
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]?.input).toMatchObject({ name: 'Testworth' });
      expect(textbox('Name')).toBeValid();
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

    it('shows how many covens use the entry once the count has arrived, never before', async () => {
      renderEntry();
      const asked = offerEntryUsers(2);

      fireEvent.click(button('Delete Ingredient'));
      // The question is up and the count has not come: no status stands in its place.
      expect(button('Delete')).toBeVisible();
      const question = screen.getByRole('group', { name: /Delete/ });
      expect(within(question).queryByRole('status')).not.toBeInTheDocument();

      expect(await within(question).findByRole('status')).toHaveTextContent('2');
      expect(asked).toEqual([{ id: ENTRY_ID }]);
    });

    // Keep It, and the focus on it, are the modal's case below.
    it('deletes it once confirmed, and says why when the delete is refused', async () => {
      const { onDeleted } = renderEntry();
      mockGraphQLError('DeleteCompendiumIngredient', {
        code: 'NOT_FOUND',
        message: 'No such compendium entry',
      });

      fireEvent.click(button('Delete Ingredient'));
      // The question names it: a paragraph, the closed Identity's summary line naming it too.
      expect(screen.getByText(/Testwort/, { selector: 'p' })).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(button('Delete'));
      });

      expect(await screen.findByRole('alert')).toBeVisible();
      expect(onDeleted).not.toHaveBeenCalled();

      const calls = acceptDelete();
      fireEvent.click(button('Delete Ingredient'));
      fireEvent.click(button('Delete'));

      await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
      expect(calls).toEqual([{ id: ENTRY_ID }]);
    });
  });

  // Its questions are asked over the form, as the unsaved changes' is
  // : the long form inert behind each, and the
  // focus on its safe answer, Keep It.
  describe('an entry given to it, in a modal', () => {
    const renderInDialog = () =>
      renderInModal((done) => (
        <IngredientForm
          duplicateHref={duplicateHref}
          workspaceId={null}
          entry={{ id: ENTRY_ID, values: TESTWORT }}
          onSaved={vi.fn()}
          onDeleted={done}
          onCancel={done}
        />
      ));

    it('holds the form while Delete asks, gives it back on Keep It, and deletes on Delete', async () => {
      offerNothing();
      const onClose = renderInDialog();
      expect(textbox('Name').closest('[inert]')).toBeNull();

      press('Delete Ingredient');
      expect(expectAskingOver(textbox('Name'), button('Keep It'))).toContainElement(
        button('Delete'),
      );
      press('Keep It');
      expectAnswered(textbox('Name'), 'Keep It');
      expect(button('Delete Ingredient')).toHaveFocus();

      const calls = acceptDelete();
      press('Delete Ingredient');
      press('Delete');

      await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
      expect(calls).toEqual([{ id: ENTRY_ID }]);
    });

    it('holds the form while a redirect asks, and gives it back on Keep It', async () => {
      offerNothing();
      mockGraphQLError('UpdateCompendiumIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['endRedirect'], message: 'Confirm to end that redirect' }],
      });
      renderInDialog();

      type('Name', 'Mockwort');
      press('Save Ingredient');
      await waitFor(() => button('End Redirect & Save'));

      expectAskingOver(textbox('Name'), button('Keep It'));
      press('Keep It');
      expectAnswered(textbox('Name'), 'Keep It');
      expect(textbox('Name')).toHaveValue('Mockwort');
    });
  });
});
