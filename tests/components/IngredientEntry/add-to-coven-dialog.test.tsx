import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddToCovenDialog from '@/components/IngredientEntry/add-to-coven-dialog';
import type { AddToCovenDialogProps } from '@/components/IngredientEntry/types';
import type { AddCupboardEntryMutation, AddCupboardEntryMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The question Add to Cupboard asks inside the public entry page's Edit menu, where two or more
// covens may add (M9.12): which one, in a Coven dropdown, those already holding the entry shown
// as held and not choosable (claude-docs/components/ingredient-entry.md, "On the public page").

const FIRST = { id: '00000000-0000-4000-8000-000000000001', name: 'Fixture Coven One' };
const SECOND = { id: '00000000-0000-4000-8000-000000000002', name: 'Fixture Coven Two' };
const COVENS = [FIRST, SECOND];
const INGREDIENT = 'fixture-salt-id';
const TITLE = { name: 'Add to Cupboard' };

const onClose = vi.fn();
const onAdded = vi.fn();

function show(over: Partial<AddToCovenDialogProps> = {}): HTMLElement {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <AddToCovenDialog
        workspaceId={FIRST.id}
        ingredientId={INGREDIENT}
        covens={COVENS}
        heldIn={[]}
        onClose={onClose}
        onAdded={onAdded}
        {...over}
      />
    </QueryClientProvider>,
  );
  return screen.getByRole('dialog', TITLE);
}

/** The dropdown of covens, a select-only combobox labelled Coven. */
const picker = (dialog: HTMLElement) => within(dialog).getByRole('combobox', { name: 'Coven' });

/** Opens the dropdown and returns one coven's option. */
function coven(dialog: HTMLElement, { name }: { name: string }): HTMLElement {
  if (picker(dialog).getAttribute('aria-expanded') !== 'true') fireEvent.click(picker(dialog));
  return within(dialog).getByRole('option', { name: new RegExp(`^${name}`) });
}

const addButton = (dialog: HTMLElement) => within(dialog).getByRole('button', { name: 'Add' });

function mockAdd() {
  const calls: AddCupboardEntryMutationVariables[] = [];
  mockGraphQLMutation<AddCupboardEntryMutation, AddCupboardEntryMutationVariables>(
    'AddCupboardEntry',
    (variables) => {
      calls.push(variables);
      return { addCupboardEntry: { id: 'fixture' } };
    },
  );
  return calls;
}

describe('AddToCovenDialog', () => {
  beforeEach(() => {
    onClose.mockReset();
    onAdded.mockReset();
  });

  it('lists the covens that may add, the default one chosen, and sends nothing until Add', () => {
    const calls = mockAdd();
    const dialog = show();

    expect(picker(dialog)).toHaveTextContent(FIRST.name);
    fireEvent.click(picker(dialog));
    expect(
      within(dialog)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(COVENS.map(({ name }) => name));
    expect(coven(dialog, FIRST)).toHaveAttribute('aria-selected', 'true');
    expect(addButton(dialog)).toBeEnabled();
    expect(calls).toEqual([]);
  });

  it("takes the page's default coven, wherever it stands in the list", () => {
    expect(picker(show({ workspaceId: SECOND.id }))).toHaveTextContent(SECOND.name);
  });

  it('adds to the coven chosen and hands the re-read back', async () => {
    const calls = mockAdd();
    const dialog = show();

    fireEvent.click(coven(dialog, SECOND));
    fireEvent.click(addButton(dialog));

    await waitFor(() => expect(onAdded).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: SECOND.id, ingredientId: INGREDIENT }]);
  });

  it('shows a coven that holds the entry as held, and it cannot be chosen', () => {
    const dialog = show({ heldIn: [SECOND.id] });

    expect(coven(dialog, SECOND)).toHaveAttribute('aria-disabled', 'true');
    expect(coven(dialog, SECOND)).toHaveTextContent('Already in My Ingredients');
    expect(coven(dialog, FIRST)).toHaveAttribute('aria-disabled', 'false');
    expect(coven(dialog, FIRST)).not.toHaveTextContent('Already in My Ingredients');
    // A press on it chooses nothing: the box still shows the default coven.
    fireEvent.click(coven(dialog, SECOND));
    expect(picker(dialog)).toHaveTextContent(FIRST.name);
  });

  it('starts on the first coven that can be chosen where the default one holds the entry', async () => {
    const calls = mockAdd();
    const dialog = show({ heldIn: [FIRST.id] });

    expect(picker(dialog)).toHaveTextContent(SECOND.name);
    fireEvent.click(addButton(dialog));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].workspaceId).toBe(SECOND.id);
  });

  it('keeps Add disabled while no coven that can be chosen is chosen', () => {
    const calls = mockAdd();
    // Every coven holds it: the page never opens the dialog so, and it still has nothing to add to.
    const dialog = show({ heldIn: [FIRST.id, SECOND.id] });

    expect(addButton(dialog)).toBeDisabled();
    fireEvent.click(addButton(dialog));
    expect(calls).toEqual([]);
  });

  it('says a refusal in the modal, which stays open and offers Add again', async () => {
    mockGraphQLError('AddCupboardEntry', {
      code: 'FORBIDDEN',
      message: 'Viewers cannot add ingredients.',
    });
    const dialog = show();

    await act(async () => {
      fireEvent.click(addButton(dialog));
    });

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Viewers cannot add ingredients.',
    );
    expect(screen.getByRole('dialog', TITLE)).toBeInTheDocument();
    expect(addButton(dialog)).toBeEnabled();
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('closes on Cancel and sends nothing', async () => {
    const calls = mockAdd();
    const dialog = show();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(calls).toEqual([]);
    expect(onAdded).not.toHaveBeenCalled();
  });
});
