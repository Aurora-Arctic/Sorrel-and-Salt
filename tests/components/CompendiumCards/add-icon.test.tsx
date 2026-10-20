import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse } from 'msw';
import CompendiumCards from '@/components/CompendiumCards';
import type { CompendiumCardEntry, CompendiumCardsProps } from '@/components/CompendiumCards/types';
import type { AddCupboardEntryMutation, AddCupboardEntryMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { expectRefusalUnder } from '../../support/click-feedback';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// The plus of someone who may write in several covens asks which in a menu (M9.12, the owner's
// call, 2026-10-20): its items are the covens that lack the entry, and choosing one adds there at
// once. With one coven lacking it, the plus adds there with no menu
// (claude-docs/components/compendium-cards.md, "The plus").

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const client = makeQueryClient();
const Cards = (props: CompendiumCardsProps): ReactElement => (
  <QueryClientProvider client={client}>
    <CompendiumCards {...props} />
  </QueryClientProvider>
);

const FIRST = { id: '00000000-0000-4000-8000-000000000001', name: 'Fixture Coven One' };
const SECOND = { id: '00000000-0000-4000-8000-000000000002', name: 'Fixture Coven Two' };
const THIRD = { id: '00000000-0000-4000-8000-000000000003', name: 'Fixture Coven Three' };
const COVENS = [FIRST, SECOND, THIRD];

const entry = (over: Partial<CompendiumCardEntry> = {}): CompendiumCardEntry => ({
  id: 'fixture-salt-id',
  name: 'Fixture Salt',
  slug: 'fixture-salt',
  canonicalName: null,
  nomenclature: 'none',
  categories: [],
  variants: [],
  toxic: false,
  safetyNotes: null,
  recency: null,
  held: false,
  heldIn: [],
  heldHref: undefined,
  ...over,
});

const props = (
  entries: CompendiumCardEntry[],
  over: Partial<CompendiumCardsProps> = {},
): CompendiumCardsProps => ({
  entries,
  filter: {
    query: '',
    forms: [],
    withoutReferences: false,
    withoutForms: false,
    elements: [],
    categories: [],
    categoryMode: 'all',
    deities: [],
    zodiac: [],
    planets: [],
    toxic: '',
  },
  facets: {
    forms: [],
    deities: [],
    categories: [],
    zodiac: [],
    planets: [],
    elements: [],
    toxic: [],
    withoutReferences: 0,
    withoutForms: 0,
  },
  categories: [],
  vocabulary: { deities: [], formIcons: {} },
  total: entries.length,
  action: 'add',
  workspaceId: FIRST.id,
  covens: COVENS,
  ...over,
});

const PLUS = { name: 'Add to My Ingredients' };

/** Opens the plus's menu and returns it. */
function openMenu(): HTMLElement {
  fireEvent.click(screen.getByRole('button', PLUS));
  return screen.getByRole('menu', PLUS);
}

/** The menu's items, by name, in order. */
const items = (menu: HTMLElement): string[] =>
  within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');

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

describe('the add icon among several covens', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.refresh.mockReset();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  it('adds at once where there is one coven, and opens no menu', async () => {
    const calls = mockAdd();
    render(<Cards {...props([entry()], { covens: [FIRST] })} />);

    fireEvent.click(screen.getByRole('button', PLUS));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: FIRST.id, ingredientId: 'fixture-salt-id' }]);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('adds at once to the one coven left without the entry, though it is not the default', async () => {
    const calls = mockAdd();
    // Why it is the menu's to skip: the viewer writes in two covens, and the default holds it.
    render(<Cards {...props([entry({ heldIn: [FIRST.id] })], { covens: [FIRST, SECOND] })} />);

    fireEvent.click(screen.getByRole('button', PLUS));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: SECOND.id, ingredientId: 'fixture-salt-id' }]);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens a menu of the covens instead of adding, and sends nothing on opening it', () => {
    const calls = mockAdd();
    render(<Cards {...props([entry()])} />);

    const menu = openMenu();

    expect(items(menu)).toEqual(COVENS.map(({ name }) => name));
    expect(calls).toEqual([]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('leaves off the menu every coven that already holds the entry', () => {
    render(<Cards {...props([entry({ heldIn: [SECOND.id] })])} />);

    expect(items(openMenu())).toEqual([FIRST.name, THIRD.name]);
  });

  it("adds to the coven chosen, by that coven's id, and reads the page again", async () => {
    const calls = mockAdd();
    render(<Cards {...props([entry()])} />);

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: SECOND.name }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: SECOND.id, ingredientId: 'fixture-salt-id' }]);
  });

  it('shows the plus busy, Adding, while the add is on its way', async () => {
    let answer: () => void = () => {};
    const gate = new Promise<void>((resolve) => (answer = resolve));
    server.use(
      graphqlLink.mutation('AddCupboardEntry', async () => {
        await gate;
        return HttpResponse.json({ data: { addCupboardEntry: { id: 'fixture' } } });
      }),
    );
    render(<Cards {...props([entry()])} />);

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: THIRD.name }));

    const busy = await screen.findByRole('button', { name: 'Adding' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toBeDisabled();
    expect(router.refresh).not.toHaveBeenCalled();
    await act(async () => answer());
    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
  });

  it('says a refusal under the plus, which keeps the focus and offers the menu again', async () => {
    mockGraphQLError('AddCupboardEntry', {
      code: 'FORBIDDEN',
      message: 'Viewers cannot add ingredients.',
    });
    render(<Cards {...props([entry()])} />);

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: FIRST.name }));

    const plus = await screen.findByRole('button', PLUS);
    expect(await expectRefusalUnder(plus, PLUS.name)).toContain('Viewers cannot add ingredients.');
    expect(plus).toBeEnabled();
    expect(plus).not.toHaveAttribute('aria-busy');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('keeps the plus on a card one coven holds, and the check where all do', () => {
    const href = '/coven/fixture-coven-one/ingredients?query=Fixture+Salt' as Route;
    render(
      <Cards
        {...props([
          entry({ id: 'one', name: 'Fixture Heldone', slug: 'heldone', heldIn: [FIRST.id] }),
          entry({
            id: 'all',
            name: 'Fixture Heldall',
            slug: 'heldall',
            held: true,
            heldIn: COVENS.map(({ id }) => id),
            heldHref: href,
          }),
        ])}
      />,
    );

    expect(screen.getAllByRole('button', PLUS)).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'In My Ingredients' })).toHaveAttribute('href', href);
  });
});
