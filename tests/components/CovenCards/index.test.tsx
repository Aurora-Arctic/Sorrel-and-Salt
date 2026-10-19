import type { Route } from 'next';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import CovenCards from '@/components/CovenCards';
import type { CovenCardEntry, CovenCardsProps } from '@/components/CovenCards/types';
import type { CompendiumFacetCounts } from '@/components/CompendiumList/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLQuery } from '../../support/msw/graphql';
import { sent } from '../../support/filter-form';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A coven's Ingredients list (M9.6): a link per entry inside the coven, the coven's own label,
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
  elements: [],
  categories: [],
  categoryMode: 'all',
  deities: [],
  zodiac: [],
  planets: [],
  toxic: '',
  source: '',
  inStock: false,
  lowStockOnly: false,
};

const FACETS: CompendiumFacetCounts = {
  forms: [],
  deities: [],
  categories: [],
  zodiac: [],
  planets: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
  withoutForms: 0,
  source: [
    { value: 'local', label: 'Local', count: 1 },
    { value: 'compendium', label: 'Compendium', count: 2 },
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
  annotated: false,
  retired: false,
  jars: [],
  ...over,
});

const ENTRIES = [
  entry('e1', 'Testwort', {
    kind: 'own',
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
  facets: FACETS,
  categories: [],
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
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
    const hrefs = within(list)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(ENTRIES.map(({ id }) => `/coven/fixture-coven/ingredients/${id}`));
  });

  it('draws a jar line for each jar an entry holds', () => {
    render(<Cards {...props()} />);
    expect(screen.getAllByText(/Fixture Herb/)).toHaveLength(1);
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

  it('holds no button on a card', () => {
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

  it('shows plain text, and no list, for an empty cupboard', () => {
    render(<Cards {...props({ entries: [], total: 0 })} />);
    expect(screen.queryByRole('list', { name: 'Ingredients' })).toBeNull();
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
    const form = screen.getByRole('form', { name: 'Filter Ingredients' });
    expect(form).toHaveAttribute('action', '/coven/fixture-coven/ingredients');
    fireEvent.click(screen.getByRole('switch', { name: /^In Stock/ }));
    expect(new URLSearchParams(sent(form)).get('inStock')).not.toBeNull();
  });

  it('reads Page X of Y between Previous and Next', () => {
    render(
      <Cards
        {...props({
          previousHref: '/coven/fixture-coven/ingredients?before=a' as Route,
          position: { page: 2, pages: 2 },
        })}
      />,
    );
    expect(screen.getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/ingredients?before=a',
    );
  });
});
