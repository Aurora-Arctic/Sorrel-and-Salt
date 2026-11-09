import type { Route } from 'next';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import CovenCards from '@/components/CovenCards';
import type { CovenCardEntry, CovenCardsProps } from '@/components/CovenCards/types';
import type { WorkspaceIngredientFacets } from '@/modules/ingredients';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLQuery } from '../../support/msw/graphql';
import { filterForm, sent } from '../../support/filter-form';
import { Navigating } from '../../support/navigating';
import { RouteModal, RouteModalProvider } from '@/components/Modal';
import { DETAILS_PLACE } from '@/components/IngredientEntry/details';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A coven's Ingredients list: a link per entry inside the coven, the coven's own label,
// the jars beneath the forms, Edit in the foot where an entry has an edit address, and a filter with the coven's three extra
// choices (claude-docs/components/coven-cards.md).

const client = makeQueryClient();
const Cards = (props: CovenCardsProps): ReactElement => (
  <QueryClientProvider client={client}>
    <CovenCards {...props} />
  </QueryClientProvider>
);

const FILTER: CovenCardsProps['filter'] = {
  query: '',
  forms: [],
  withoutReferences: false,
  withoutForms: false,
  hidden: false,
  elements: [],
  categories: [],
  categoryMode: 'all',
  deities: [],
  zodiac: [],
  celestialBodies: [],
  toxic: '',
  reviewed: '',
  covens: [],
  covensNot: false,
  source: '',
  inStock: false,
  lowStockOnly: false,
};

const COUNTS: WorkspaceIngredientFacets = {
  forms: [],
  deities: [],
  categories: [],
  zodiacSigns: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  source: [
    { value: 'local', count: 1 },
    { value: 'compendium', count: 2 },
  ],
  inStock: 1,
  lowStockOnly: 0,
};

const entry = (id: string, label: string, over: Partial<CovenCardEntry> = {}): CovenCardEntry => ({
  id,
  label,
  canonicalName: null,
  nomenclature: 'none',
  categories: [],
  variants: [],
  toxic: false,
  safetyNotes: null,
  kind: 'cupboard',
  retired: false,
  jars: [],
  details: {
    href: `/coven/fixture-coven/ingredients?entry=${id}` as Route,
    heading: { eyebrow: 'Ingredient', title: label },
  },
  ...over,
});

const ENTRIES = [
  entry('e1', 'Testwort', {
    kind: 'own',
    variants: [{ form: 'fixture herb' }, { form: 'fixture oil' }],
    jars: [
      { id: 'j1', form: 'Fixture Herb', icon: null, quantity: 3, unit: 'oz', threshold: null },
    ],
  }),
  entry('e2', 'Fixture Salt'),
];

const props = (over: Partial<CovenCardsProps> = {}): CovenCardsProps => ({
  covenSlug: 'fixture-coven',
  workspaceId: 'w1',
  entries: ENTRIES,
  filter: FILTER,
  counts: COUNTS,
  categories: [],
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
  canAdd: true,
  ...over,
});

describe('CovenCards', () => {
  beforeEach(() => {
    router.push.mockReset();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  it('links each entry to its page inside the coven', () => {
    render(<Cards {...props()} />);
    const list = screen.getByRole('list', { name: 'Ingredients' });
    const hrefs = ENTRIES.map(({ label }) =>
      within(list).getByRole('link', { name: label }).getAttribute('href'),
    );
    expect(hrefs).toEqual(ENTRIES.map(({ id }) => `/coven/fixture-coven/ingredients/${id}`));
  });

  it("opens an entry's details modal over the list from its Quick Look, the name a plain link to its page", async () => {
    render(
      <Navigating push={router.push}>
        <RouteModalProvider>
          <Cards {...props()} />
          <RouteModal
            place={DETAILS_PLACE}
            closeHref={'/coven/fixture-coven/ingredients' as Route}
          />
        </RouteModalProvider>
      </Navigating>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Fixture Salt' }));
    });
    expect(router.push.mock.lastCall?.[0]).toBe('/coven/fixture-coven/ingredients/e2');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const look = screen.getByRole('link', { name: 'Quick Look Fixture Salt' });
    expect(look).toHaveAttribute('href', '/coven/fixture-coven/ingredients?entry=e2');
    await act(async () => {
      fireEvent.click(look);
    });

    expect(router.push.mock.lastCall?.[0]).toBe('/coven/fixture-coven/ingredients?entry=e2');
    expect(screen.getByRole('dialog', { name: 'Ingredient, Fixture Salt' })).toBeInTheDocument();
  });

  it('draws no forms line, the jar lines standing in its place', () => {
    render(<Cards {...props()} />);
    const card = screen.getByRole('list', { name: 'Ingredients' });
    expect(within(card).getAllByText(/Fixture Herb/)).toHaveLength(1);
    expect(within(card).queryByText(/Fixture Oil/i)).toBeNull();
  });

  it('draws Edit Stock on a card only when it is given the stock, opening on its jars', () => {
    const stock = {
      forms: [
        { variantId: 'v1', label: 'Fixture Herb' },
        { variantId: 'v2', label: 'Fixture Oil' },
      ],
      jars: [{ id: 'j1', variantId: 'v1', quantity: 3, unit: 'oz', threshold: null }],
    };
    render(<Cards {...props({ entries: [{ ...ENTRIES[0]!, stock }, ENTRIES[1]!] })} />);
    const list = screen.getByRole('list', { name: 'Ingredients' });
    const pencils = within(list).getAllByRole('button', { name: /^Edit Stock/ });
    expect(pencils).toHaveLength(1);
    expect(pencils[0]).toHaveAccessibleName('Edit Stock, Testwort');
  });

  it("puts Edit Stock first in a card's foot, before Edit", () => {
    const editHref = '/coven/fixture-coven/ingredients?edit=e1' as Route;
    const stock = { forms: [{ variantId: 'v1', label: 'Fixture Herb' }], jars: [] };
    render(
      <Cards
        {...props({
          entries: [
            {
              ...ENTRIES[0]!,
              editHref,
              editHeading: { eyebrow: 'Edit Ingredient', title: 'Testwort' },
              stock,
            },
          ],
        })}
      />,
    );
    const list = screen.getByRole('list', { name: 'Ingredients' });
    const pencil = within(list).getByRole('button', { name: /^Edit Stock/ });
    const edit = within(list).getByRole('link', { name: /^Edit Testwort/ });
    expect(pencil.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('draws Edit on a card only when it is given an edit address, named for the entry', () => {
    const editHref = '/coven/fixture-coven/ingredients?edit=e1' as Route;
    render(
      <Cards
        {...props({
          entries: [
            {
              ...ENTRIES[0]!,
              canonicalName: 'Fixtura testalis',
              editHref,
              editHeading: { eyebrow: 'Edit Ingredient', title: 'Testwort' },
            },
            ENTRIES[1]!,
          ],
        })}
      />,
    );
    const list = screen.getByRole('list', { name: 'Ingredients' });
    const edits = within(list).getAllByRole('link', { name: /^Edit/ });
    expect(edits).toHaveLength(1);
    expect(edits[0]).toHaveAccessibleName('Edit Testwort, Fixtura testalis');
    expect(edits[0]).toHaveAttribute('href', editHref);
  });

  it('draws Annotate on a card only when it is given an annotate address, named for the entry', () => {
    const annotateHref = '/coven/fixture-coven/ingredients?annotate=e2' as Route;
    render(
      <Cards
        {...props({
          entries: [
            ENTRIES[0]!,
            { ...ENTRIES[1]!, canonicalName: 'Fixtura annotata', annotateHref },
          ],
        })}
      />,
    );
    const list = screen.getByRole('list', { name: 'Ingredients' });
    const annotates = within(list).getAllByRole('link', { name: /^Annotate/ });
    expect(annotates).toHaveLength(1);
    expect(annotates[0]).toHaveAccessibleName(`Annotate ${ENTRIES[1]!.label}, Fixtura annotata`);
    expect(annotates[0]).toHaveAttribute('href', annotateHref);
    expect(within(list).queryAllByRole('link', { name: /^Edit/ })).toHaveLength(0);
  });

  it('holds no button on a card where the role may do nothing more', () => {
    render(<Cards {...props()} />);
    const list = screen.getByRole('list', { name: 'Ingredients' });
    expect(within(list).queryAllByRole('button')).toHaveLength(0);
  });

  it('puts the Compact switch, on by default, inside the search landmark', () => {
    mockGraphQLQuery('CovenFacetCounts', () => ({}));
    render(<Cards {...props()} />);
    const compact = screen.getByRole('switch', { name: 'Compact' });
    expect(compact.closest('search')).not.toBeNull();
    expect(compact).toBeChecked();
    expect(screen.getAllByRole('switch', { name: 'Compact' })).toHaveLength(1);
  });

  const empty = { entries: [], total: 0 };
  const emptyState = () => screen.queryByRole('status', { name: 'No Ingredients' });
  const noMatchState = () => screen.queryByRole('status', { name: 'No Matches' });

  it('offers the first add for an empty cupboard, opening the shell dialog by the address', () => {
    window.history.replaceState(null, '', '/coven/fixture-coven/ingredients');
    render(<Cards {...props(empty)} />);
    expect(screen.queryByRole('list', { name: 'Ingredients' })).toBeNull();
    expect(noMatchState()).toBeNull();
    const state = emptyState();
    expect(state).not.toBeNull();
    fireEvent.click(within(state!).getByRole('button', { name: 'Add Ingredient' }));
    expect(new URLSearchParams(window.location.search).get('new')).toBe(
      'ingredient-coven-fixture-coven',
    );
    // The add is a button writing the address, never a link to another page.
    expect(within(state!).queryByRole('link', { name: 'Add Ingredient' })).toBeNull();
  });

  it('links the empty cupboard to the Ingredients help article', () => {
    render(<Cards {...props(empty)} />);

    expect(within(emptyState()!).getByRole('link', { name: 'Learn More' })).toHaveAttribute(
      'href',
      '/help/ingredients',
    );
  });

  it("draws a viewer's empty cupboard with no add", () => {
    render(<Cards {...props({ ...empty, canAdd: false })} />);
    expect(emptyState()).not.toBeNull();
    expect(within(emptyState()!).queryByRole('button')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add Ingredient' })).toBeNull();
  });

  // The roles named are the state's data (rule 2's exception): nothing else tells a viewer who to ask.
  it('names, to a viewer only, the roles that can fill an empty cupboard', () => {
    const { unmount } = render(<Cards {...props({ ...empty, canAdd: false })} />);
    expect(emptyState()).toHaveTextContent(/\bpractitioner\b/i);
    expect(emptyState()).toHaveTextContent(/\bsteward\b/i);
    unmount();
    render(<Cards {...props(empty)} />);
    expect(emptyState()).not.toHaveTextContent(/\bpractitioner\b|\bsteward\b/i);
  });

  // The empty region says the cupboard is empty, so the count line, which would say so too, is not drawn.
  // A filter matching nothing keeps it, as it carries the search sentence.
  it('draws no count line over an empty cupboard, and keeps it over a filter that matched nothing', () => {
    // Only the regions that say something: a combobox's results announcer is a status region too.
    const saying = () => screen.getAllByRole('status').filter((region) => region.textContent);
    const { unmount } = render(<Cards {...props(empty)} />);
    expect(saying()).toEqual([emptyState()]);
    unmount();

    render(<Cards {...props({ ...empty, filter: { ...FILTER, query: 'Knitbone' } })} />);
    expect(saying()).toHaveLength(2);
    expect(saying()).toContain(noMatchState());
  });

  it('draws a search matching nothing as the no-match state, handing the search to the Compendium', () => {
    render(<Cards {...props({ ...empty, filter: { ...FILTER, query: 'Knitbone' } })} />);
    expect(emptyState()).toBeNull();
    const state = noMatchState();
    expect(state).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Add Ingredient' })).toBeNull();
    expect(state).not.toHaveTextContent('Knitbone');
    // Two ways on: back to the whole cupboard, every filter dropped, and the search handed to the Compendium.
    expect(within(state!).queryByRole('button')).toBeNull();
    expect(within(state!).getAllByRole('link')).toHaveLength(2);
    expect(within(state!).getByRole('link', { name: 'Clear Filters' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/ingredients',
    );
    expect(within(state!).getByRole('link', { name: 'Search the Compendium' })).toHaveAttribute(
      'href',
      '/compendium?query=Knitbone',
    );
  });

  it('treats a coven-only filter matching nothing as no match, offering only Clear Filters', () => {
    render(<Cards {...props({ ...empty, filter: { ...FILTER, inStock: true } })} />);
    expect(emptyState()).toBeNull();
    expect(noMatchState()).not.toBeNull();
    // No search word, so nothing to hand the Compendium: the one way on is the whole cupboard.
    expect(within(noMatchState()!).getAllByRole('link')).toHaveLength(1);
    expect(within(noMatchState()!).getByRole('link', { name: 'Clear Filters' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/ingredients',
    );
    expect(screen.queryByRole('button', { name: 'Add Ingredient' })).toBeNull();
  });

  it('offers Source, In Stock and Low Stock Only, and submits to the coven page', () => {
    // The panel asks for the counts of the filter it holds, and the page already has them.
    mockGraphQLQuery('CovenFacetCounts', () => ({
      workspaceIngredientFacets: {
        forms: [],
        deities: [],
        categories: [],
        zodiacSigns: [],
        celestialBodies: [],
        elements: [],
        toxic: [],
        source: [],
        inStock: 0,
        lowStockOnly: 0,
      },
    }));
    render(<Cards {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    expect(screen.getByRole('switch', { name: /^In Stock/ })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /^Low Stock Only/ })).toBeInTheDocument();
    const form = filterForm('Filter Ingredients');
    expect(form).toHaveAttribute('action', '/coven/fixture-coven/ingredients');
    fireEvent.click(screen.getByRole('switch', { name: /^In Stock/ }));
    expect(new URLSearchParams(sent(form)).get('inStock')).not.toBeNull();
  });

  it("types the sentence from the coven's own facets of the search being opened", async () => {
    // The line types on a 16 ms tick (SearchSentence); on the real clock the case took 20 s. Only
    // the timers are faked, as in CompendiumList/index.test.tsx, so the line types as the test advances it.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    mockGraphQLQuery('CovenFacetCounts', () => ({
      workspaceIngredientFacets: {
        forms: [],
        deities: [],
        categories: [],
        zodiacSigns: [],
        celestialBodies: [],
        elements: [],
        toxic: [],
        source: [],
        inStock: 0,
        lowStockOnly: 0,
      },
    }));
    render(
      <Navigating push={router.push}>
        <Cards {...props({ filter: { ...FILTER, inStock: true } })} />
      </Navigating>,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    fireEvent.click(screen.getByRole('switch', { name: /^In Stock/ }));
    fireEvent.click(screen.getByRole('switch', { name: /^Low Stock Only/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
    });

    const pushed = new URL(router.push.mock.lastCall![0], 'http://localhost').searchParams;
    expect(pushed.get('lowStockOnly')).not.toBeNull();
    expect(pushed.get('inStock')).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(1500));
    await act(() => vi.advanceTimersByTimeAsync(1500));
    const typed = screen
      .getAllByRole('group', { hidden: true })
      .find((group) => group.tagName === 'DETAILS' && group.getAttribute('aria-hidden') === 'true');
    expect(typed).toBeDefined();
    expect(typed!.textContent).toContain('low or out of stock');
    expect(typed!.textContent).not.toContain('in stock');
  });
});
