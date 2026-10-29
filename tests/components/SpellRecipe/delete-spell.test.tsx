import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeleteSpellAction from '@/components/SpellRecipe/delete-spell';
import type { DeleteSpellMutation, DeleteSpellMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// Delete Spell on the recipe page (M13.11): the bin named for the spell, which asks in a
// dialog, deletes nothing on Cancel, and on Delete runs the mutation and leaves for the
// grimoire list (claude-docs/components/spell-recipe.md).

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
const ID = '00000000-0000-4000-8000-000000000002';
const DELETED_HREF = '/coven/fixture-coven/grimoire?deleted=Fixture+Working' as Route;

let queryClient = makeQueryClient();
const onPage = () => (
  <QueryClientProvider client={queryClient}>
    <main>
      <h1>Fixture Working</h1>
      <DeleteSpellAction
        workspaceId={WORKSPACE_ID}
        spellId={ID}
        name="Fixture Working"
        deletedHref={DELETED_HREF}
      />
    </main>
  </QueryClientProvider>
);
function renderOnPage() {
  queryClient = makeQueryClient();
  return render(onPage());
}

const bin = () => screen.getByRole('button', { name: 'Delete Spell Fixture Working' });

function acceptDelete() {
  const calls: DeleteSpellMutationVariables[] = [];
  mockGraphQLMutation<DeleteSpellMutation, DeleteSpellMutationVariables>(
    'DeleteSpell',
    (variables) => {
      calls.push(variables);
      return { deleteSpell: String(variables.id) };
    },
  );
  return calls;
}

describe('DeleteSpellAction', () => {
  beforeEach(() => {
    router.replace.mockClear();
    router.push.mockClear();
  });

  it('asks before deleting, in a dialog naming the spell, deletes nothing on Cancel, and gives the bin the focus back', async () => {
    const calls = acceptDelete();
    renderOnPage();

    press(bin());
    const ask = screen.getByRole('dialog', { name: 'Delete Spell' });
    expect(within(ask).getByText('Fixture Working')).toBeInTheDocument();
    press(within(ask).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bin()).toHaveFocus();
    expect(calls).toEqual([]);
  });

  it("deletes the spell, replaces the address with the list's, and gives the list's heading the focus", async () => {
    const calls = acceptDelete();
    const view = renderOnPage();

    press(bin());
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(DELETED_HREF));
    expect(calls).toEqual([{ id: ID, workspaceId: WORKSPACE_ID }]);
    expect(router.push).not.toHaveBeenCalled();
    // Busy until the list arrives, so the focus is not handed back to the page first.
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: /Delet/ }),
    ).toBeDisabled();

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <main>
          <h1>Grimoire</h1>
        </main>
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Grimoire' })).toHaveFocus(),
    );
  });

  it("shows the service's refusal and gives the bin the focus back", async () => {
    mockGraphQLError('DeleteSpell', { code: 'NOT_FOUND', message: 'No such spell in this coven' });
    renderOnPage();

    press(bin());
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bin()).toHaveFocus();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
