import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SpellMoreMenu from '@/components/SpellRecipe/more-menu';
import type {
  DeleteSpellMutation,
  DeleteSpellMutationVariables,
  DuplicateSpellMutation,
  DuplicateSpellMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The recipe page's three dots: Duplicate for a role that may create a spell, Delete Spell for one
// that may delete, and Print for every role (claude-docs/components/spell-recipe.md).

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
const ID = '00000000-0000-4000-8000-000000000002';
const COPY_ID = '00000000-0000-4000-8000-000000000003';
const DELETED_HREF = '/coven/fixture-coven/grimoire?deleted=Fixture+Working' as Route;

function renderMenu({ canDuplicate = true, canDelete = true, canPrint = true } = {}) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <main>
        <h1>Fixture Working</h1>
        <SpellMoreMenu
          workspaceId={WORKSPACE_ID}
          covenSlug="fixture-coven"
          spellId={ID}
          name="Fixture Working"
          deletedHref={DELETED_HREF}
          canDuplicate={canDuplicate}
          canDelete={canDelete}
          canPrint={canPrint}
        />
      </main>
    </QueryClientProvider>,
  );
}

const dots = () => screen.getByRole('button', { name: 'More for Fixture Working' });
const choose = (name: string) => {
  press(dots());
  press(screen.getByRole('menuitem', { name }));
};

describe('SpellMoreMenu', () => {
  beforeEach(() => {
    router.push.mockClear();
    router.replace.mockClear();
  });

  it('offers Duplicate and Delete Spell to a role that may do both', async () => {
    renderMenu();
    press(dots());
    expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual([
      'Duplicate',
      'Print',
      'Delete Spell',
    ]);
  });

  it('offers only Duplicate to a role that may not delete', async () => {
    renderMenu({ canDelete: false });
    press(dots());
    expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual([
      'Duplicate',
      'Print',
    ]);
  });

  it('offers only Delete Spell to a role that may not duplicate', async () => {
    renderMenu({ canDuplicate: false });
    press(dots());
    expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual([
      'Print',
      'Delete Spell',
    ]);
  });

  it('offers only Print to a role that may do neither', async () => {
    renderMenu({ canDuplicate: false, canDelete: false });
    press(dots());
    expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual([
      'Print',
    ]);
  });

  it('draws no menu when it holds nothing, as on a card, which does not print', () => {
    renderMenu({ canDuplicate: false, canDelete: false, canPrint: false });
    expect(screen.queryByRole('button', { name: /^More for/ })).not.toBeInTheDocument();
  });

  it('opens the print dialog when Print is chosen', () => {
    // jsdom has no `window.print`.
    const print = vi.fn();
    vi.stubGlobal('print', print);
    renderMenu({ canDuplicate: false, canDelete: false });
    expect(print).not.toHaveBeenCalled();
    choose('Print');
    expect(print).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("duplicates the spell and leaves for the Drafts tab with the copy's dialog open", async () => {
    const calls: DuplicateSpellMutationVariables[] = [];
    mockGraphQLMutation<DuplicateSpellMutation, DuplicateSpellMutationVariables>(
      'DuplicateSpell',
      (variables) => {
        calls.push(variables);
        return { duplicateSpell: { id: COPY_ID } };
      },
    );
    renderMenu();

    choose('Duplicate');

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        `/coven/fixture-coven/grimoire/drafts?edit=${COPY_ID}`,
      ),
    );
    expect(calls).toEqual([{ workspaceId: WORKSPACE_ID, id: ID }]);
  });

  it('says why when the service refuses a duplicate, and goes nowhere', async () => {
    mockGraphQLError('DuplicateSpell', {
      code: 'FORBIDDEN',
      message: 'Not allowed to create a spell here.',
    });
    renderMenu();

    choose('Duplicate');

    expect(await screen.findByRole('alert')).toHaveTextContent(/not allowed/i);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('asks before deleting, deletes nothing on Cancel, and gives the dots the focus back', async () => {
    const calls: DeleteSpellMutationVariables[] = [];
    mockGraphQLMutation<DeleteSpellMutation, DeleteSpellMutationVariables>(
      'DeleteSpell',
      (variables) => {
        calls.push(variables);
        return { deleteSpell: String(variables.id) };
      },
    );
    renderMenu();

    choose('Delete Spell');
    const ask = screen.getByRole('dialog', { name: 'Delete Spell' });
    expect(within(ask).getByText('Fixture Working')).toBeInTheDocument();
    press(within(ask).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(dots()).toHaveFocus();
    expect(calls).toEqual([]);
  });

  it('deletes the spell and replaces the address with the list’s', async () => {
    const calls: DeleteSpellMutationVariables[] = [];
    mockGraphQLMutation<DeleteSpellMutation, DeleteSpellMutationVariables>(
      'DeleteSpell',
      (variables) => {
        calls.push(variables);
        return { deleteSpell: String(variables.id) };
      },
    );
    renderMenu();

    choose('Delete Spell');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(DELETED_HREF));
    expect(calls).toEqual([{ id: ID, workspaceId: WORKSPACE_ID }]);
  });

  it('shows the service’s refusal of a delete and gives the dots the focus back', async () => {
    mockGraphQLError('DeleteSpell', { code: 'NOT_FOUND', message: 'No such spell in this coven' });
    renderMenu();

    choose('Delete Spell');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(dots()).toHaveFocus();
  });
});
