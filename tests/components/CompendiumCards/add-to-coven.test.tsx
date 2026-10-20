import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import CompendiumCards from '@/components/CompendiumCards';
import type { CompendiumCardEntry, CompendiumCardsProps } from '@/components/CompendiumCards/types';
import type { AddCupboardEntryMutation, AddCupboardEntryMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The plus of someone who may write in several covens asks which (M9.12, the owner's call,
// 2026-10-20): a confirm modal with a picker of the covens, those already holding the entry
// shown as held and not choosable (claude-docs/components/compendium-cards.md, "The picker").

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
const COVENS = [FIRST, SECOND];

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

/** Opens the picker from the plus and returns the dialog. */
async function openPicker(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole('button', PLUS));
  return screen.findByRole('dialog', PLUS);
}

/** The dropdown of covens, a select-only combobox labelled Coven. */
const picker = (dialog: HTMLElement) => within(dialog).getByRole('combobox', { name: 'Coven' });

/** Opens the dropdown and returns one coven's option. */
function coven(dialog: HTMLElement, { name }: { name: string }): HTMLElement {
  if (picker(dialog).getAttribute('aria-expanded') !== 'true') fireEvent.click(picker(dialog));
  return within(dialog).getByRole('option', { name: new RegExp(`^${name}`) });
}

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

  it('adds at once where there is one coven, and opens no modal', async () => {
    const calls = mockAdd();
    render(<Cards {...props([entry()], { covens: [FIRST] })} />);

    fireEvent.click(screen.getByRole('button', PLUS));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: FIRST.id, ingredientId: 'fixture-salt-id' }]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a modal instead of adding, and sends nothing until Add is pressed', async () => {
    const calls = mockAdd();
    render(<Cards {...props([entry()])} />);

    const dialog = await openPicker();

    expect(within(dialog).getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(calls).toEqual([]);
  });

  it('lists the covens the viewer may write in, the default one chosen', async () => {
    render(<Cards {...props([entry()])} />);

    const dialog = await openPicker();

    expect(picker(dialog)).toHaveTextContent(FIRST.name);
    fireEvent.click(picker(dialog));
    expect(
      within(dialog)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(COVENS.map(({ name }) => name));
    expect(coven(dialog, FIRST)).toHaveAttribute('aria-selected', 'true');
    expect(coven(dialog, SECOND)).toHaveAttribute('aria-selected', 'false');
    expect(within(dialog).getByRole('button', { name: 'Add' })).toBeEnabled();
  });

  it("takes the page's default coven, wherever it stands in the list", async () => {
    render(<Cards {...props([entry()], { workspaceId: SECOND.id })} />);

    const dialog = await openPicker();

    expect(picker(dialog)).toHaveTextContent(SECOND.name);
  });

  it('adds to the coven chosen, closes the modal and reads the page again', async () => {
    const calls = mockAdd();
    render(<Cards {...props([entry()])} />);
    const dialog = await openPicker();

    fireEvent.click(coven(dialog, SECOND));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(calls).toEqual([{ workspaceId: SECOND.id, ingredientId: 'fixture-salt-id' }]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('shows a coven that holds the entry as held, and it cannot be chosen', async () => {
    render(<Cards {...props([entry({ heldIn: [SECOND.id] })])} />);

    const dialog = await openPicker();

    expect(coven(dialog, SECOND)).toHaveAttribute('aria-disabled', 'true');
    expect(coven(dialog, SECOND)).toHaveTextContent('Already in My Ingredients');
    expect(coven(dialog, FIRST)).toHaveAttribute('aria-disabled', 'false');
    expect(coven(dialog, FIRST)).not.toHaveTextContent('Already in My Ingredients');
    // A press on it chooses nothing: the box still shows the default coven.
    fireEvent.click(coven(dialog, SECOND));
    expect(picker(dialog)).toHaveTextContent(FIRST.name);
    expect(picker(dialog)).not.toHaveTextContent(SECOND.name);
  });

  it('starts on the first coven that can be chosen where the default one holds the entry', async () => {
    const calls = mockAdd();
    render(<Cards {...props([entry({ heldIn: [FIRST.id] })])} />);

    const dialog = await openPicker();

    expect(picker(dialog)).toHaveTextContent(SECOND.name);
    expect(coven(dialog, FIRST)).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(picker(dialog));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].workspaceId).toBe(SECOND.id);
  });

  it('keeps Add disabled while no coven that can be chosen is chosen', async () => {
    const calls = mockAdd();
    // Every coven holds it though the card was given the plus: the page never sends this, and
    // the modal still has nothing to add to.
    render(<Cards {...props([entry({ heldIn: [FIRST.id, SECOND.id] })])} />);

    const dialog = await openPicker();

    expect(picker(dialog)).not.toHaveTextContent(FIRST.name);
    expect(picker(dialog)).not.toHaveTextContent(SECOND.name);
    expect(within(dialog).getByRole('button', { name: 'Add' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(calls).toEqual([]);
  });

  it('says a refusal in the modal, which stays open and offers Add again', async () => {
    mockGraphQLError('AddCupboardEntry', {
      code: 'FORBIDDEN',
      message: 'Viewers cannot add ingredients.',
    });
    render(<Cards {...props([entry()])} />);
    const dialog = await openPicker();

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    });

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Viewers cannot add ingredients.',
    );
    expect(screen.getByRole('dialog', PLUS)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Add' })).toBeEnabled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('closes on Cancel and sends nothing', async () => {
    const calls = mockAdd();
    render(<Cards {...props([entry()])} />);
    const dialog = await openPicker();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(calls).toEqual([]);
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
            heldIn: [FIRST.id, SECOND.id],
            heldHref: href,
          }),
        ])}
      />,
    );

    expect(screen.getAllByRole('button', PLUS)).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'In My Ingredients' })).toHaveAttribute('href', href);
  });
});
