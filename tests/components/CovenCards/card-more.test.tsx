import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CardMore from '@/components/CovenCards/card-more';
import type { CardMoreProps } from '@/components/CovenCards/types';
import type {
  DeleteOwnIngredientMutation,
  DeleteOwnIngredientMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A coven card's More (M8.17): Link and Delete on the coven's own entry, Make It Ours and
// Remove on a compendium entry, a lone choice as its own icon; Delete, Make It Ours and Remove
// ask in place (option A), and a write that takes the card away leaves the focus on the page's
// heading, a refusal on More (claude-docs/components/coven-cards.md).

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
const ID = '00000000-0000-4000-8000-000000000002';
const LIST = '/coven/fixture-coven/ingredients';
const LINK_HREF = `${LIST}?link=${ID}` as Route;

const OWN: CardMoreProps = {
  id: ID,
  label: 'Testwort',
  name: 'Testwort',
  workspaceId: WORKSPACE_ID,
  covenSlug: 'fixture-coven',
  linkHref: LINK_HREF,
  mayDelete: true,
};
const HELD: CardMoreProps = {
  ...OWN,
  label: 'House Salt',
  name: 'House Salt',
  linkHref: undefined,
  mayDelete: false,
  mayMakeOurs: true,
  mayRemove: true,
};

let queryClient = makeQueryClient();
const onPage = (props?: CardMoreProps) => (
  <QueryClientProvider client={queryClient}>
    <main>
      <h1>Ingredients</h1>
      {props && <CardMore {...props} />}
    </main>
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

  it("offers Link and Delete on the coven's own entry, Link at its address", () => {
    renderOnPage(OWN);
    expect(choices('Testwort')).toEqual(['Link to the Compendium', 'Delete Ingredient']);
    expect(screen.getByRole('menuitem', { name: 'Link to the Compendium' })).toHaveAttribute(
      'href',
      LINK_HREF,
    );
  });

  it('offers Make It Ours and Remove on a compendium entry the cupboard holds', () => {
    renderOnPage(HELD);
    expect(choices('House Salt')).toEqual(['Make It Ours', 'Remove']);
  });

  it('draws a lone Delete as its own button, which asks in a dialog, and no menu', async () => {
    renderOnPage({ ...OWN, linkHref: undefined });
    expect(screen.queryByRole('button', { name: /^More for/ })).not.toBeInTheDocument();
    press(screen.getByRole('button', { name: 'Delete Testwort' }));
    expect(await screen.findByRole('dialog', { name: 'Delete Ingredient' })).toBeInTheDocument();
  });

  it('draws a lone Link as its own link to the address', () => {
    renderOnPage({ ...OWN, mayDelete: false });
    expect(screen.getByRole('link', { name: 'Link Testwort' })).toHaveAttribute('href', LINK_HREF);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('draws nothing where the role may do nothing more', () => {
    renderOnPage({ ...OWN, linkHref: undefined, mayDelete: false });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it("deletes the entry, reads the list again, and gives the page's heading the focus once the card is gone", async () => {
    const calls = acceptDelete();
    const view = renderOnPage(OWN);

    choose('Testwort', 'Delete Ingredient');
    press(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(calls).toEqual([{ id: ID, workspaceId: WORKSPACE_ID }]);
    expect(router.replace).not.toHaveBeenCalled();

    // The list arrives again without the card.
    view.rerender(onPage());
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Ingredients' })).toHaveFocus(),
    );
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
