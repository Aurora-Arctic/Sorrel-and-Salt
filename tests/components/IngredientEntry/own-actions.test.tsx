import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OwnEntryActions from '@/components/IngredientEntry/own-actions';
import type { IngredientEntryEdit } from '@/components/IngredientEntry/types';
import type {
  DeleteOwnIngredientMutation,
  DeleteOwnIngredientMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The Edit menu on a coven's own entry's page (M8.17): Edit and Delete, asked
// in a dialog shared with the list card's More (claude-docs/components/ingredient-entry.md).

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
const ID = '00000000-0000-4000-8000-000000000002';
const PAGE = `/coven/fixture-coven/ingredients/${ID}`;

const EDIT: IngredientEntryEdit = {
  href: `${PAGE}?edit` as Route,
  closeHref: PAGE as Route,
  deletedHref: '/coven/fixture-coven/ingredients' as Route,
  coven: {
    workspaceId: WORKSPACE_ID,
    ingredientsHref: '/coven/fixture-coven/ingredients' as Route,
    mayPromote: true,
  },
};

const ENTRY = { id: ID, name: 'Testwort', canonicalName: null, nomenclature: 'unknown' as const };

let queryClient = makeQueryClient();
const onPage = (edit: IngredientEntryEdit = EDIT) => (
  <QueryClientProvider client={queryClient}>
    <main>
      <h1>Testwort</h1>
      <OwnEntryActions edit={edit} entry={ENTRY} />
    </main>
  </QueryClientProvider>
);
function renderOnPage(edit?: IngredientEntryEdit) {
  queryClient = makeQueryClient();
  return render(onPage(edit));
}

const menuButton = () => screen.getByRole('button', { name: 'Edit Testwort' });

/** The open Edit menu's choices, read without pressing. */
function shownChoices(): string[] {
  return within(screen.getByRole('menu', { name: 'Edit Testwort' }))
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}

function choices(): string[] {
  fireEvent.click(menuButton());
  return within(screen.getByRole('menu', { name: 'Edit Testwort' }))
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}

function choose(name: string): void {
  fireEvent.click(menuButton());
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name }));
}

function acceptDelete() {
  const calls: DeleteOwnIngredientMutationVariables[] = [];
  mockGraphQLMutation<DeleteOwnIngredientMutation, DeleteOwnIngredientMutationVariables>(
    'DeleteOwnIngredient',
    (variables) => {
      calls.push(variables);
      return { deleteIngredient: String(variables.id) };
    },
  );
  return calls;
}

describe('OwnEntryActions', () => {
  beforeEach(() => {
    router.replace.mockClear();
    router.push.mockClear();
  });

  // The pencil at the end of the name's row (the owner's call, 2026-10-20): MenuButton's icon
  // form, named for the entry as the modal's pencil is, with the Edit tip and no word of its own.
  it('is the pencil, a menu button named Edit and the entry, with the Edit tip, and no plain Edit', async () => {
    renderOnPage();

    const pencil = screen.getByRole('button', { name: 'Edit Testwort' });
    expect(pencil).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    fireEvent.mouseEnter(pencil);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Edit');
    fireEvent.mouseLeave(pencil);
    // Opening the menu shuts the tip from IconTip's MutationObserver, a step after the
    // press: inside an async act, so that update is awaited rather than left outside it.
    await act(async () => {
      fireEvent.click(pencil);
    });
    expect(shownChoices()).toEqual(['Edit Ingredient', 'Delete Ingredient']);
  });

  it('offers Edit and Delete in one Edit menu, Edit at its address', () => {
    renderOnPage();

    expect(choices()).toEqual(['Edit Ingredient', 'Delete Ingredient']);
    expect(screen.getByRole('menuitem', { name: 'Edit Ingredient' })).toHaveAttribute(
      'href',
      EDIT.href,
    );
  });

  it('asks before deleting, in a dialog, deletes nothing on Cancel, and gives Edit the focus back', async () => {
    const calls = acceptDelete();
    renderOnPage();

    choose('Delete Ingredient');
    const ask = screen.getByRole('dialog', { name: 'Delete Ingredient' });
    expect(within(ask).getByText('Testwort')).toBeInTheDocument();
    press(within(ask).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(menuButton()).toHaveFocus();
    expect(calls).toEqual([]);
  });

  it("deletes the entry, replaces the address with the list, and gives the list's heading the focus", async () => {
    const calls = acceptDelete();
    const view = renderOnPage();

    choose('Delete Ingredient');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(EDIT.deletedHref));
    expect(calls).toEqual([{ id: ID, workspaceId: WORKSPACE_ID }]);
    expect(router.push).not.toHaveBeenCalled();
    // Busy until the list arrives, so the focus is not handed to Edit first.
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: /Delet/ }),
    ).toBeDisabled();

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <main>
          <h1>Ingredients</h1>
        </main>
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Ingredients' })).toHaveFocus(),
    );
  });

  it("shows the service's refusal and gives Edit the focus back", async () => {
    mockGraphQLError('DeleteOwnIngredient', { code: 'NOT_FOUND', message: 'No such ingredient' });
    renderOnPage();

    choose('Delete Ingredient');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(menuButton()).toHaveFocus();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
