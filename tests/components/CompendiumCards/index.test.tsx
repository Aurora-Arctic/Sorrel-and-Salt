import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import CompendiumCards from '@/components/CompendiumCards';
import type { CompendiumCardEntry, CompendiumCardsProps } from '@/components/CompendiumCards/types';
import type {
  CompendiumFacetCounts,
  CompendiumListFilter,
} from '@/components/CompendiumList/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { sent } from '../../support/filter-form';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The public compendium's cards (M8.18): a plain link per entry, the forms with their icons,
// the foot each kind of visitor gets, and a filter that offers no Classification and no
// No Refs (claude-docs/components/compendium-cards.md).

const client = makeQueryClient();
const Cards = (props: CompendiumCardsProps): ReactElement => (
  <QueryClientProvider client={client}>
    <CompendiumCards {...props} />
  </QueryClientProvider>
);

const NO_FILTER: CompendiumListFilter = {
  query: '',
  forms: [],
  withoutReferences: false,
  elements: [],
  categories: [],
  categoryMode: 'all',
  deities: [],
  zodiac: [],
  planets: [],
  toxic: '',
};

const FACETS: CompendiumFacetCounts = {
  forms: [],
  deities: [],
  categories: [],
  zodiac: [],
  planets: [],
  elements: [],
  toxic: [],
  withoutReferences: 4,
};

const entry = (
  name: string,
  slug: string,
  canonicalName: string | null,
  forms: string[],
): CompendiumCardEntry => ({
  id: slug,
  name,
  slug,
  canonicalName,
  nomenclature: canonicalName ? 'botanical' : 'none',
  categories: [],
  variants: forms.map((form) => ({ form, formChoice: null })),
  toxic: false,
  safetyNotes: null,
});

// Two entries share a label; their formal names tell them apart.
const ENTRIES = [
  entry('Testwort', 'testwort-fixtura-testalis', 'Fixtura testalis', [
    'Fixture Herb',
    'Fixture Oil',
  ]),
  entry('Testwort', 'testwort-fixtura-alteralis', 'Fixtura alteralis', ['Fixture Herb']),
  entry('Fixture Salt', 'fixture-salt', null, []),
];

const props = (over: Partial<CompendiumCardsProps> = {}): CompendiumCardsProps => ({
  entries: ENTRIES,
  filter: NO_FILTER,
  facets: FACETS,
  categories: [],
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
  action: 'none',
  ...over,
});

describe('CompendiumCards', () => {
  beforeEach(() => {
    router.push.mockReset();
    // The panel opens as it does from the tablet width up.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  it('lists each entry as a plain link to its own page, with no modal', () => {
    render(<Cards {...props()} />);
    const list = screen.getByRole('list', { name: 'Compendium' });
    const hrefs = within(list)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(ENTRIES.map(({ slug }) => `/compendium/ingredients/${slug}`));
    expect(within(list).getAllByRole('listitem')).toHaveLength(ENTRIES.length);
  });

  it('tells two entries of one label apart by their formal names', () => {
    render(<Cards {...props()} />);
    expect(screen.getByText('Fixtura testalis')).toBeInTheDocument();
    expect(screen.getByText('Fixtura alteralis')).toBeInTheDocument();
  });

  it('draws every form an entry has', () => {
    render(<Cards {...props()} />);
    expect(screen.getAllByText('Fixture Herb')).toHaveLength(2);
    expect(screen.getByText('Fixture Oil')).toBeInTheDocument();
  });

  it('holds a disabled Add to My Ingredients on each card for someone who can add', () => {
    render(<Cards {...props({ action: 'add' })} />);
    const buttons = screen.getAllByRole('button', { name: 'Add to My Ingredients' });
    expect(buttons).toHaveLength(ENTRIES.length);
    for (const button of buttons) expect(button).toBeDisabled();
  });

  it('holds a Sign In link back to the page for a visitor with no account', () => {
    render(<Cards {...props({ action: 'sign-in', signInHref: '/sign-in?next=%2Fcompendium' })} />);
    const links = screen.getAllByRole('link', { name: 'Sign In' });
    expect(links).toHaveLength(ENTRIES.length);
    for (const link of links) expect(link).toHaveAttribute('href', '/sign-in?next=%2Fcompendium');
    expect(screen.queryByRole('button', { name: 'Add to My Ingredients' })).toBeNull();
  });

  it('holds neither for an account that only views', () => {
    render(<Cards {...props({ action: 'none' })} />);
    expect(screen.queryByRole('button', { name: 'Add to My Ingredients' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Sign In' })).toBeNull();
  });

  it('reads Page X of Y between Previous and Next', () => {
    render(
      <Cards
        {...props({
          previousHref: '/compendium?before=a',
          position: { page: 2, pages: 2 },
        })}
      />,
    );
    expect(screen.getByRole('link', { name: 'Prev' })).toHaveAttribute(
      'href',
      '/compendium?before=a',
    );
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('offers no Classification and no No Refs, and submits to the public page', () => {
    render(<Cards {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    expect(screen.queryByRole('switch', { name: /^No Refs/ })).toBeNull();
    expect(screen.queryByRole('group', { name: /Classification/ })).toBeNull();
    const form = screen.getByRole('form', { name: 'Filter the Compendium' });
    expect(form).toHaveAttribute('action', '/compendium');
    expect(new URLSearchParams(sent(form)).has('withoutReferences')).toBe(false);
  });
});
