import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

// The Edit and Delete icons on a coven's own entry's page, Delete asked
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

const dots = () => screen.getByRole('button', { name: 'More for Testwort' });
/** Opens the three dots and chooses Delete Ingredient. */
function askDelete() {
  fireEvent.click(dots());
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete Ingredient' }));
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

  // The pencil, a link to the page's own edit address, and the three dots, which hold
  // Delete Ingredient even with no stock to edit: the page never draws a lone bin.
  it('is an Edit link at its address and the three dots holding Delete Ingredient, each named for the entry, and no bin', () => {
    renderOnPage();

    expect(screen.getByRole('link', { name: 'Edit Testwort' })).toHaveAttribute('href', EDIT.href);
    expect(screen.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
    fireEvent.click(dots());
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Delete Ingredient',
    ]);
  });

  it('asks before deleting, in a dialog, deletes nothing on Cancel, and gives the dots the focus back', async () => {
    const calls = acceptDelete();
    renderOnPage();

    askDelete();
    const ask = screen.getByRole('dialog', { name: 'Delete Ingredient' });
    expect(within(ask).getByText('Testwort')).toBeInTheDocument();
    press(within(ask).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(dots()).toHaveFocus();
    expect(calls).toEqual([]);
  });

  it("deletes the entry, replaces the address with the list, and gives the list's heading the focus", async () => {
    const calls = acceptDelete();
    const view = renderOnPage();

    askDelete();
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

  it("shows the service's refusal and gives the dots the focus back", async () => {
    mockGraphQLError('DeleteOwnIngredient', { code: 'NOT_FOUND', message: 'No such ingredient' });
    renderOnPage();

    askDelete();
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(dots()).toHaveFocus();
    expect(router.replace).not.toHaveBeenCalled();
  });

  // Edit Stock: with the stock handed over, it comes first in the three dots.
  describe('with the stock to edit', () => {
    const FLOWER = '00000000-0000-4000-8000-0000000000f1';
    const withStock: IngredientEntryEdit = {
      ...EDIT,
      coven: {
        ...EDIT.coven!,
        stock: {
          forms: [{ variantId: FLOWER, label: 'Flower' }],
          jars: [
            {
              id: '00000000-0000-4000-8000-000000000991',
              variantId: FLOWER,
              quantity: 50,
              unit: 'g',
              threshold: null,
            },
          ],
        },
      },
    };
    it('puts Edit Stock first and Delete Ingredient after it in the three dots, and draws no bin', () => {
      renderOnPage(withStock);
      fireEvent.click(dots());

      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'Edit Stock',
        'Delete Ingredient',
      ]);
      expect(screen.queryByRole('button', { name: 'Delete Ingredient Testwort' })).toBeNull();
      expect(screen.getByRole('link', { name: 'Edit Testwort' })).toBeInTheDocument();
    });

    it("opens this coven's Edit Stock dialog at once", async () => {
      renderOnPage(withStock);
      fireEvent.click(dots());
      fireEvent.click(screen.getByRole('menuitem', { name: 'Edit Stock' }));

      const dialog = await screen.findByRole('dialog', { name: 'Edit Stock, Testwort' });
      expect(within(dialog).getByRole('button', { name: /^Flower\b/ })).toBeInTheDocument();
    });

    it('asks to delete from the dots beside Edit Stock', async () => {
      renderOnPage(withStock);
      askDelete();

      expect(await screen.findByRole('dialog', { name: 'Delete Ingredient' })).toBeInTheDocument();
    });
  });
});
