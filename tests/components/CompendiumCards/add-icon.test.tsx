import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse } from 'msw';
import CompendiumCards from '@/components/CompendiumCards';
import type { CompendiumCardEntry, CompendiumCardsProps } from '@/components/CompendiumCards/types';
import type { AddCupboardEntryMutation, AddCupboardEntryMutationVariables } from '@/gql/graphql';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { makeQueryClient } from '@/lib/graphql-client';
import { expectRefusalUnder } from '../../support/click-feedback';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// The plus of someone who may write in several covens asks which in a menu (M9.12, the owner's
// call, 2026-10-20): its items are every coven, one holding the entry disabled, and choosing one
// adds there at once. With one coven at all, the plus adds there with no menu. A success turns
// the spinner into a check, which fades back to the plus after a hold unless every coven now
// holds the entry (claude-docs/components/compendium-cards.md, "The plus").

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const client = makeQueryClient();
const Cards = (props: CompendiumCardsProps): ReactElement => (
  <StatusRegionProvider>
    <QueryClientProvider client={client}>
      <CompendiumCards {...props} />
    </QueryClientProvider>
  </StatusRegionProvider>
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

/** The menu's items, by their labels (a held one's mark left out), in order. */
const items = (menu: HTMLElement): string[] =>
  within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.firstChild?.textContent ?? '');

/** Every coven by name, the order the menu lists them in. */
const BY_NAME = [FIRST, THIRD, SECOND];
/** A held coven's item: its name, then the mark its check stands for. */
const held = (name: string) => `${name}, in My Ingredients`;

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

  // The owner’s call, 2026-10-20: the plus adds at once only where there is one coven at all,
  // never because one coven alone is left without the entry.
  it('opens a menu where there are two covens and one holds the entry, the holder disabled', () => {
    const calls = mockAdd();
    // Why it could have added at once: the viewer writes in two covens, and only SECOND lacks it.
    render(<Cards {...props([entry({ heldIn: [FIRST.id] })], { covens: [FIRST, SECOND] })} />);

    const menu = openMenu();

    expect(items(menu)).toEqual([FIRST.name, SECOND.name]);
    const holder = within(menu).getByRole('menuitem', { name: held(FIRST.name) });
    expect(holder).toHaveAttribute('aria-disabled', 'true');
    expect(holder).not.toHaveAccessibleDescription();
    expect(within(menu).getByRole('menuitem', { name: SECOND.name })).not.toHaveAttribute(
      'aria-disabled',
    );
    expect(calls).toEqual([]);
  });

  it('sends nothing when the held coven is chosen, and keeps the menu open', async () => {
    const calls = mockAdd();
    render(<Cards {...props([entry({ heldIn: [FIRST.id] })], { covens: [FIRST, SECOND] })} />);
    const menu = openMenu();

    fireEvent.click(within(menu).getByRole('menuitem', { name: held(FIRST.name) }));

    await act(async () => {});
    expect(calls).toEqual([]);
    expect(router.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('menu', PLUS)).toBeVisible();
  });

  it('opens a menu of the covens instead of adding, and sends nothing on opening it', () => {
    const calls = mockAdd();
    render(<Cards {...props([entry()])} />);

    const menu = openMenu();

    expect(items(menu)).toEqual(BY_NAME.map(({ name }) => name));
    expect(calls).toEqual([]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lists every coven by name, one that holds the entry shown disabled and marked, not left off', () => {
    render(<Cards {...props([entry({ heldIn: [SECOND.id] })])} />);
    const menu = openMenu();

    expect(items(menu)).toEqual(BY_NAME.map(({ name }) => name));
    const disabled = within(menu)
      .getAllByRole('menuitem')
      .filter((item) => item.getAttribute('aria-disabled') === 'true');
    expect(disabled).toEqual([within(menu).getByRole('menuitem', { name: held(SECOND.name) })]);
    expect(disabled[0]).not.toHaveAccessibleDescription();
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
          }),
        ])}
      />,
    );

    expect(screen.getAllByRole('button', PLUS)).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'In My Ingredients' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'In My Ingredients' })).toBeNull();
  });
});

// The owner's call, 2026-10-20: "When you click the plus and it adds to a coven the loading should
// animate into a check mark and then fade to the plus." The plus says which it shows in its
// `data-state`, the attribute its stylesheet draws from: `added` for the check, `returning` while
// the check fades back to the plus, and none for the plus itself.
describe('the plus after an add', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    router.refresh.mockReset();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    return () => vi.useRealTimers();
  });

  const plus = (): HTMLElement => screen.getByRole('button', PLUS);
  /** What the statuses say: the page's region, and the cards' own count. */
  const said = (): string[] =>
    screen.getAllByRole('status').map((status) => status.textContent?.trim() ?? '');

  it('shows the check on a success, says so once, and returns to the plus after the hold', async () => {
    mockAdd();
    // Why it could return: two covens, neither holding the entry, so one add leaves one lacking it.
    render(<Cards {...props([entry()], { covens: [FIRST, SECOND] })} />);
    expect(plus()).not.toHaveAttribute('data-state');

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: SECOND.name }));

    await waitFor(() => expect(plus()).toHaveAttribute('data-state', 'added'));
    expect(plus()).toHaveAccessibleName(PLUS.name);
    expect(said()).toContain(`Added to ${SECOND.name}.`);
    await act(() => vi.advanceTimersByTimeAsync(900));
    expect(plus()).toHaveAttribute('data-state', 'added');

    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(plus()).toHaveAttribute('data-state', 'returning');
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(plus()).not.toHaveAttribute('data-state');
    expect(plus()).toHaveAccessibleName(PLUS.name);
    expect(plus()).toBeEnabled();
    // The coven just added to is held until the page says so, so the menu cannot add it twice.
    expect(within(openMenu()).getByRole('menuitem', { name: held(SECOND.name) })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('keeps the check where the add left every coven holding the entry', async () => {
    mockAdd();
    // Two covens, the second already holding it: adding to the first leaves none lacking it.
    render(<Cards {...props([entry({ heldIn: [SECOND.id] })], { covens: [FIRST, SECOND] })} />);

    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: FIRST.name }));

    await waitFor(() => expect(plus()).toHaveAttribute('data-state', 'added'));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(plus()).toHaveAttribute('data-state', 'added');
  });

  it('keeps the check on the lone plus, whose one coven then holds the entry', async () => {
    mockAdd();
    render(<Cards {...props([entry()], { covens: [FIRST] })} />);

    fireEvent.click(plus());

    await waitFor(() => expect(plus()).toHaveAttribute('data-state', 'added'));
    expect(plus()).toHaveAccessibleName(PLUS.name);
    expect(said()).toContain(`Added to ${FIRST.name}.`);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(plus()).toHaveAttribute('data-state', 'added');
  });

  it('never shows the check on a refusal, and says nothing in the status region', async () => {
    mockGraphQLError('AddCupboardEntry', {
      code: 'FORBIDDEN',
      message: 'Viewers cannot add ingredients.',
    });
    render(<Cards {...props([entry()], { covens: [FIRST] })} />);

    fireEvent.click(plus());

    expect(await expectRefusalUnder(plus(), PLUS.name)).toContain(
      'Viewers cannot add ingredients.',
    );
    expect(plus()).not.toHaveAttribute('data-state');
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(plus()).not.toHaveAttribute('data-state');
    expect(said().filter((text) => text.startsWith('Added'))).toEqual([]);
  });
});
