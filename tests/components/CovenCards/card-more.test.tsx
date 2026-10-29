import type { Route } from 'next';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CardMore from '@/components/CovenCards/card-more';
import type { CardMoreProps } from '@/components/CovenCards/types';
import type {
  DeleteOwnIngredientMutation,
  DeleteOwnIngredientMutationVariables,
} from '@/gql/graphql';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A coven card's More: Delete on the coven's own entry, Make It Ours and
// Remove on a compendium entry, a lone Delete or Remove its own bin and two choices a menu;
// Delete, Make It Ours and Remove ask in place (option A), and a write that takes the card away leaves the focus on the page's
// heading, a refusal on More (claude-docs/components/coven-cards.md).

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
const ID = '00000000-0000-4000-8000-000000000002';
const LIST = '/coven/fixture-coven/ingredients' as Route;

const OWN: CardMoreProps = {
  id: ID,
  label: 'Testwort',
  name: 'Testwort',
  workspaceId: WORKSPACE_ID,
  covenSlug: 'fixture-coven',
  mayDelete: true,
};
const HELD: CardMoreProps = {
  ...OWN,
  label: 'House Salt',
  name: 'House Salt',
  mayDelete: false,
  mayMakeOurs: true,
  mayRemove: true,
};

let queryClient = makeQueryClient();
const onPage = (props?: CardMoreProps) => (
  <QueryClientProvider client={queryClient}>
    <StatusRegionProvider>
      <main>
        <h1>Ingredients</h1>
        {props && <CardMore {...props} />}
      </main>
    </StatusRegionProvider>
  </QueryClientProvider>
);
function renderOnPage(props: CardMoreProps) {
  queryClient = makeQueryClient();
  return render(onPage(props));
}

const more = (name: string) => screen.getByRole('button', { name: `More for ${name}` });
function choices(name: string): string[] {
  fireEvent.click(more(name));
  return within(screen.getByRole('menu', { name: `More for ${name}` }))
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}
function choose(name: string, item: string): void {
  fireEvent.click(more(name));
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: item }));
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

describe('CardMore', () => {
  beforeEach(() => {
    router.replace.mockClear();
    router.push.mockClear();
    router.refresh.mockClear();
  });

  it("draws a lone Delete on the coven's own entry as a button of its own, and no menu", async () => {
    renderOnPage(OWN);
    expect(screen.queryByRole('button', { name: /^More for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    press(screen.getByRole('button', { name: 'Delete Ingredient Testwort' }));
    expect(await screen.findByRole('dialog', { name: 'Delete Ingredient' })).toBeInTheDocument();
  });

  it('draws a lone Remove as a button of its own, which asks in a dialog', async () => {
    renderOnPage({ ...HELD, mayMakeOurs: false });
    expect(screen.queryByRole('button', { name: /^More for/ })).not.toBeInTheDocument();
    press(screen.getByRole('button', { name: 'Remove House Salt' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('offers Make It Ours and Remove on a compendium entry the cupboard holds', () => {
    renderOnPage(HELD);
    expect(choices('House Salt')).toEqual(['Make It Ours', 'Remove']);
    // The dots draw their labelled section though every choice is the coven's.
    const menu = screen.getByRole('menu', { name: 'More for House Salt' });
    expect(within(menu).getByRole('group', { name: 'Coven' })).toContainElement(
      within(menu).getByRole('menuitem', { name: 'Remove' }),
    );
    expect(within(menu).queryByRole('group', { name: 'Compendium' })).not.toBeInTheDocument();
  });

  it('keeps a lone Make It Ours in the menu', () => {
    renderOnPage({ ...HELD, mayRemove: false });
    expect(choices('House Salt')).toEqual(['Make It Ours']);
  });

  it('draws nothing where the role may do nothing more', () => {
    renderOnPage({ ...OWN, mayDelete: false });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it("deletes the entry, reads the list again, and gives the page's heading the focus once the card is gone", async () => {
    const calls = acceptDelete();
    const view = renderOnPage(OWN);

    press(screen.getByRole('button', { name: 'Delete Ingredient Testwort' }));
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(calls).toEqual([{ id: ID, workspaceId: WORKSPACE_ID }]);
    expect(router.replace).not.toHaveBeenCalled();

    // The removal is said in the page's status region, which outlives the card.
    expect(screen.getByRole('status')).toHaveTextContent('Testwort deleted');

    // The list arrives again without the card.
    view.rerender(onPage());
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Ingredients' })).toHaveFocus(),
    );
  });

  it('leaves for the given address after a delete, replacing the history entry and reading nothing again', async () => {
    const calls = acceptDelete();
    renderOnPage({ ...OWN, leaveHref: LIST });

    press(screen.getByRole('button', { name: 'Delete Ingredient Testwort' }));
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(LIST));
    expect(calls).toEqual([{ id: ID, workspaceId: WORKSPACE_ID }]);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('leaves for the given address after a remove', async () => {
    mockGraphQLMutation('RemoveCupboardEntry', () => ({ removeCupboardEntry: ID }));
    renderOnPage({ ...HELD, mayMakeOurs: false, leaveHref: LIST });

    press(screen.getByRole('button', { name: 'Remove House Salt' }));
    press(within(await screen.findByRole('dialog')).getByRole('button', { name: /^Remove/ }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(LIST));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("shows the service's refusal of a lone Delete and gives its bin the focus back", async () => {
    mockGraphQLError('DeleteOwnIngredient', { code: 'FORBIDDEN', message: 'Not allowed' });
    renderOnPage(OWN);

    const bin = screen.getByRole('button', { name: 'Delete Ingredient Testwort' });
    press(bin);
    press(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bin).toHaveFocus();
    expect(router.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it("shows the service's refusal of a Remove and gives More the focus back", async () => {
    mockGraphQLError('RemoveCupboardEntry', { code: 'NOT_FOUND', message: 'No such ingredient' });
    renderOnPage(HELD);

    choose('House Salt', 'Remove');
    const ask = screen.getByRole('dialog');
    press(within(ask).getByRole('button', { name: /^Remove/ }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(more('House Salt')).toHaveFocus();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
