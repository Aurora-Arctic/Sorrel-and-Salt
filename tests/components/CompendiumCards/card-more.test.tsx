import type { Route } from 'next';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompendiumCardMore from '@/components/CompendiumCards/card-more';
import type {
  CompendiumCardMoreProps,
  CompendiumCardPlace,
} from '@/components/CompendiumCards/types';
import type { StockData, StockJar } from '@/components/StockDialog/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { press } from '../../support/interact';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The three dots on a compendium card: what a signed-in member may
// do about an entry in the covens that hold it. Drawn only when it holds a choice, so a viewer
// whose role permits nothing and a page that found no holding coven see no dots
// (claude-docs/components/compendium-cards.md).

const ID = '00000000-0000-4000-8000-000000000002';
const LIST = '/compendium' as Route;

const FLOWER = '00000000-0000-4000-8000-0000000000f1';
const OIL = '00000000-0000-4000-8000-0000000000f2';

/** The covens' stock the dialog reads: every form, and the jars this coven holds. */
const stock = (jars: StockJar[] = []): StockData => ({
  forms: [
    { variantId: FLOWER, label: 'Flower' },
    { variantId: OIL, label: 'Oil' },
  ],
  jars,
});
const jar = (variantId: string, quantity: number): StockJar => ({
  id: `00000000-0000-4000-8000-00000000009${quantity % 10}`,
  variantId,
  quantity,
  unit: 'g',
  threshold: null,
});

const place = (over: Partial<CompendiumCardPlace> = {}): CompendiumCardPlace => ({
  workspaceId: '00000000-0000-4000-8000-000000000001',
  covenSlug: 'fixture-coven',
  name: 'Fixture Coven',
  canAnnotate: true,
  canMakeOurs: true,
  canRemove: true,
  annotateHref: '/compendium/ingredients/house-salt?annotate=fixture-coven' as Route,
  ...over,
});

const props = (
  places: readonly CompendiumCardPlace[],
  over: Partial<CompendiumCardMoreProps> = {},
): CompendiumCardMoreProps => ({
  id: ID,
  label: 'House Salt',
  name: 'House Salt',
  places,
  leaveHref: LIST,
  ...over,
});

const renderMore = (value: CompendiumCardMoreProps) =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <main>
        <h1>Compendium</h1>
        <CompendiumCardMore {...value} />
      </main>
    </QueryClientProvider>,
  );

const more = () => screen.getByRole('button', { name: 'More for House Salt' });
function choices(): string[] {
  fireEvent.click(more());
  return within(screen.getByRole('menu', { name: 'More for House Salt' }))
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}
function choose(item: string): void {
  fireEvent.click(more());
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: item }));
}

describe('CompendiumCardMore', () => {
  beforeEach(() => {
    router.push.mockClear();
    router.replace.mockClear();
    router.refresh.mockClear();
  });

  it('holds Annotate, Make It Ours and Remove for a member of the coven that holds the entry', () => {
    renderMore(props([place()]));
    expect(choices()).toEqual(['Annotate', 'Make It Ours', 'Remove']);
    // Every choice is the coven's, and the dots still draw the labelled section (the owner's call,
    // 2026-10-20), with no empty Compendium one.
    const menu = screen.getByRole('menu', { name: 'More for House Salt' });
    expect(within(menu).getAllByRole('group')).toHaveLength(1);
    expect(
      within(within(menu).getByRole('group', { name: 'Coven' })).getAllByRole('menuitem'),
    ).toHaveLength(3);
  });

  it("holds only what the role permits, and Annotate leads to that coven's dialog", () => {
    renderMore(props([place({ canMakeOurs: false, canRemove: false })]));
    expect(choices()).toEqual(['Annotate']);
    expect(screen.getByRole('menuitem', { name: 'Annotate' })).toHaveAttribute(
      'href',
      '/compendium/ingredients/house-salt?annotate=fixture-coven',
    );
  });

  it('draws nothing where the role permits nothing, or the page found no holding coven', () => {
    const none = { canAnnotate: false, canMakeOurs: false, canRemove: false };
    const view = renderMore(props([place(none)]));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    view.unmount();
    renderMore(props([]));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('asks which coven where two may annotate', async () => {
    renderMore(
      props([
        place(),
        place({ workspaceId: '00000000-0000-4000-8000-000000000003', name: 'Other Coven' }),
      ]),
    );
    choose('Annotate');
    const picker = await screen.findByRole('dialog');
    expect(within(picker).getByRole('combobox', { name: 'Coven' })).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('removes in the coven, then leaves for the list', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('RemoveCupboardEntry', (variables) => {
      calls.push(variables);
      return { removeCupboardEntry: ID };
    });
    renderMore(props([place()]));

    choose('Remove');
    press(within(await screen.findByRole('dialog')).getByRole('button', { name: /^Remove/ }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(LIST));
    expect(calls).toHaveLength(1);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("shows the service's refusal of a Remove and gives More the focus back", async () => {
    mockGraphQLError('RemoveCupboardEntry', { code: 'NOT_FOUND', message: 'No such ingredient' });
    renderMore(props([place()]));

    choose('Remove');
    press(within(await screen.findByRole('dialog')).getByRole('button', { name: /^Remove/ }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(more()).toHaveFocus();
    expect(router.replace).not.toHaveBeenCalled();
  });

  describe('Edit Stock', () => {
    const others = { canAnnotate: false, canMakeOurs: false, canRemove: false };

    it('goes first in the menu, for a coven where the role may update stock', () => {
      renderMore(props([place({ stock: stock() })]));
      expect(choices()).toEqual(['Edit Stock', 'Annotate', 'Make It Ours', 'Remove']);
    });

    it('is the only choice the dots hold for a role that may update stock and do nothing else', () => {
      renderMore(props([place({ ...others, stock: stock() })]));
      expect(choices()).toEqual(['Edit Stock']);
    });

    it('is not offered where the role may not update stock, whatever else it may do', () => {
      renderMore(props([place()]));
      expect(choices()).not.toContain('Edit Stock');
    });

    it("opens the coven's dialog at once for one coven, with its jars and the entry's forms", async () => {
      renderMore(props([place({ stock: stock([jar(FLOWER, 50)]) })]));
      choose('Edit Stock');
      const dialog = await screen.findByRole('dialog', {
        name: 'Edit Stock for Fixture Coven, House Salt',
      });
      expect(within(dialog).queryByRole('combobox', { name: 'Coven' })).not.toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /^Flower\b/ })).toBeInTheDocument();
      expect(within(dialog).getByRole('combobox', { name: 'Add Form' })).toBeInTheDocument();
    });

    it('asks only among the covens that may update stock', async () => {
      renderMore(
        props([
          place({ stock: stock() }),
          place({
            workspaceId: '00000000-0000-4000-8000-000000000003',
            name: 'Other Coven',
          }),
        ]),
      );
      choose('Edit Stock');
      expect(
        await screen.findByRole('dialog', { name: 'Edit Stock for Fixture Coven, House Salt' }),
      ).toBeInTheDocument();
    });
  });
});
