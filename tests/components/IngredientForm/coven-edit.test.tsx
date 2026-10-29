import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import { COMPENDIUM_EDIT_NOTICE } from '@/components/IngredientForm/compendium-notice';
import type { IngredientFormProps, IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import type {
  DeleteWorkspaceIngredientMutation,
  DeleteWorkspaceIngredientMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { duplicateHref, renderWithClient, textbox, waitFor } from '../../support/ingredient-form';
import { press, type } from '../../support/interact';
import {
  ENTRY_ID,
  WORKSPACE_ID,
  acceptCovenUpdate,
  offerNothing,
} from '../../support/msw/ingredient-lookups';

// The form editing a coven's own entry: what an edit changes on the
// coven tier, written once here. What an edit does in either tier — one save,
// off until something changes, a rename's near match holding nothing — is
// compendium.test.tsx's, and the form's every field index.test.tsx's.

const FOLK_ID = '5a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c03';

/** Testwort as a coven holds it: a formal name, a saved folk name. */
const TESTWORT: IngredientFormValues = {
  ...EMPTY_VALUES,
  name: 'Testwort',
  nomenclature: 'botanical',
  canonicalName: 'Fixtura testalis',
  folkNames: [{ value: 'Hedge Fixture', id: FOLK_ID }],
};

function renderEdit(props: Pick<IngredientFormProps, 'onDeleted'> = {}) {
  const onSaved = vi.fn();
  offerNothing();
  renderWithClient(
    <IngredientForm
      duplicateHref={duplicateHref}
      workspaceId={WORKSPACE_ID}
      entry={{ id: ENTRY_ID, values: TESTWORT }}
      onSaved={onSaved}
      {...props}
    />,
  );
  return { onSaved };
}

function acceptCovenDelete() {
  const calls: DeleteWorkspaceIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    DeleteWorkspaceIngredientMutation,
    DeleteWorkspaceIngredientMutationVariables
  >('DeleteWorkspaceIngredient', (variables) => {
    calls.push(variables);
    return { deleteIngredient: String(variables.id) };
  });
  return calls;
}

const button = (name: string) => screen.getByRole('button', { name });
const noButton = (name: string) =>
  expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();

describe("IngredientForm editing a coven's own entry", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('carries no notice that it edits the compendium', () => {
    renderEdit();
    expect(textbox('Name')).toHaveValue('Testwort');
    expect(screen.queryByText(COMPENDIUM_EDIT_NOTICE)).not.toBeInTheDocument();
  });

  it('saves the whole entry over itself in the coven, and opens it', async () => {
    const calls = acceptCovenUpdate();
    const { onSaved } = renderEdit();

    expect(textbox('Name')).toHaveValue('Testwort');
    noButton('Save & Add Another');
    expect(button('Save Ingredient')).toBeDisabled();

    type('Name', 'Mockwort');
    press('Save Ingredient');

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({
      workspaceId: WORKSPACE_ID,
      id: ENTRY_ID,
      input: {
        name: 'Mockwort',
        nomenclature: 'botanical',
        canonicalName: 'Fixtura testalis',
        folkNames: ['Hedge Fixture'],
        variants: [],
      },
    });
    expect(onSaved).toHaveBeenCalledWith(
      { id: ENTRY_ID, name: 'Mockwort', slug: 'mockwort-fixtura-testalis' },
      'open',
    );
  });

  // Delete sits at the dialog's foot as the compendium's does (moved
  // from M9.10 by the owner, 2026-10-19), and deletes from this coven alone.
  it('deletes the entry from the coven once confirmed, naming it, and says why when refused', async () => {
    const onDeleted = vi.fn();
    renderEdit({ onDeleted });

    press('Delete Ingredient');
    expect(screen.getByText(/Testwort/, { selector: 'p' })).toBeInTheDocument();
    expect(button('Keep It')).toHaveFocus();
    press('Keep It');
    noButton('Delete');

    mockGraphQLError('DeleteWorkspaceIngredient', {
      code: 'NOT_FOUND',
      message: 'No such ingredient',
    });
    press('Delete Ingredient');
    await act(async () => {
      press('Delete');
    });
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(onDeleted).not.toHaveBeenCalled();

    const calls = acceptCovenDelete();
    press('Delete Ingredient');
    press('Delete');

    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ id: ENTRY_ID, workspaceId: WORKSPACE_ID }]);
  });

  it('places a refusal beside the field it names, and keeps what was typed', async () => {
    mockGraphQLError('UpdateWorkspaceIngredient', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'], message: 'Testwort is taken in this coven' }],
    });
    const { onSaved } = renderEdit();

    type('Name', 'Mockwort');
    press('Save Ingredient');

    await waitFor(() => expect(textbox('Name')).toBeInvalid());
    expect(textbox('Name')).toHaveAccessibleDescription(/Testwort is taken in this coven/);
    expect(textbox('Name')).toHaveValue('Mockwort');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
