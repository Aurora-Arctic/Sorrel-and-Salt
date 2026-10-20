import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
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
import type { AddCupboardEntryMutation, AddCupboardEntryMutationVariables } from '@/gql/graphql';
import { expectRefusalUnder } from '../../support/click-feedback';
import { sent } from '../../support/filter-form';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
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
  withoutForms: false,
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
  withoutForms: 0,
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
  recency: null,
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

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';

const props = (over: Partial<CompendiumCardsProps> = {}): CompendiumCardsProps => ({
  entries: ENTRIES,
  filter: NO_FILTER,
  facets: FACETS,
  categories: [],
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
  action: 'none',
  workspaceId: WORKSPACE_ID,
  ...over,
});

describe('CompendiumCards', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.refresh.mockReset();
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

  describe('the add icon', () => {
    const addTo = (slug: string) => {
      const item = screen
        .getAllByRole('listitem')
        .find((one) => within(one).queryByRole('link', { name: new RegExp(slug) }));
      return item;
    };

    it('holds a plus button named Add to My Ingredients on each card not yet held', () => {
      render(<Cards {...props({ action: 'add' })} />);
      const buttons = screen.getAllByRole('button', { name: 'Add to My Ingredients' });
      expect(buttons).toHaveLength(ENTRIES.length);
      for (const button of buttons) expect(button).toBeEnabled();
      expect(screen.queryByRole('img', { name: 'In My Ingredients' })).toBeNull();
    });

    // The owner's call, 2026-10-20: the check is a status mark, not a link. The details
    // modal's In Your Covens list carries the links to each coven's copy.
    it('swaps the plus for a check mark on a card every coven holds, a mark and no link', () => {
      const held = ENTRIES.map((one, index) => (index === 0 ? { ...one, held: true } : one));
      render(<Cards {...props({ entries: held, action: 'add' })} />);
      expect(screen.getAllByRole('button', { name: 'Add to My Ingredients' })).toHaveLength(2);
      const mark = screen.getByRole('img', { name: 'In My Ingredients' });
      expect(mark.closest('a')).toBeNull();
      expect(mark).not.toHaveAttribute('tabindex');
      expect(screen.queryByRole('link', { name: 'In My Ingredients' })).toBeNull();
      // Nothing in the card's foot under that name takes the focus either.
      for (const named of screen.getAllByLabelText('In My Ingredients')) {
        expect(named.closest('a, button')).toBeNull();
      }
    });

    it('draws neither without a coven to add to', () => {
      const held = ENTRIES.map((one, index) => (index === 0 ? { ...one, held: true } : one));
      render(<Cards {...props({ entries: held, action: 'add', workspaceId: undefined })} />);
      expect(screen.queryByRole('button', { name: 'Add to My Ingredients' })).toBeNull();
      expect(screen.queryByRole('img', { name: 'In My Ingredients' })).toBeNull();
    });

    it('draws neither where the action is none, even for a held entry', () => {
      const held = ENTRIES.map((one) => ({ ...one, held: true }));
      render(<Cards {...props({ entries: held, action: 'none' })} />);
      expect(screen.queryByRole('img', { name: 'In My Ingredients' })).toBeNull();
    });

    it('adds that entry to the coven and reads the page again', async () => {
      const calls: AddCupboardEntryMutationVariables[] = [];
      mockGraphQLMutation<AddCupboardEntryMutation, AddCupboardEntryMutationVariables>(
        'AddCupboardEntry',
        (variables) => {
          calls.push(variables);
          return { addCupboardEntry: { id: 'fixture' } };
        },
      );
      render(<Cards {...props({ action: 'add' })} />);
      const card = addTo('Fixture Salt')!;

      fireEvent.click(within(card).getByRole('button', { name: 'Add to My Ingredients' }));

      await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
      expect(calls).toEqual([{ workspaceId: WORKSPACE_ID, ingredientId: 'fixture-salt' }]);
    });

    it('says a refusal under the button and offers the add again', async () => {
      mockGraphQLError('AddCupboardEntry', {
        code: 'FORBIDDEN',
        message: 'Viewers cannot add ingredients.',
      });
      render(<Cards {...props({ action: 'add' })} />);
      const button = within(addTo('Fixture Salt')!).getByRole('button', {
        name: 'Add to My Ingredients',
      });

      act(() => button.focus());
      fireEvent.click(button);

      await expectRefusalUnder(button, 'Add to My Ingredients');
      expect(button).not.toHaveAttribute('aria-busy');
      expect(router.refresh).not.toHaveBeenCalled();
    });
  });

  // M8.17: a curator's Edit, named for the entry, beside Add where the account can add too.
  it('draws Edit, named for the entry, on each card the page gives an edit address', () => {
    const editable = ENTRIES.map((one) => ({
      ...one,
      editHref: `/compendium?edit=${one.slug}` as Route,
      editHeading: { eyebrow: 'Edit Compendium Entry', title: one.name },
    }));
    render(<Cards {...props({ entries: editable, action: 'add' })} />);
    const hrefs = screen
      .getAllByRole('link', { name: /^Edit / })
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(editable.map(({ editHref }) => editHref));
    expect(
      screen.getByRole('link', { name: 'Edit Testwort, Fixtura alteralis' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Fixture Salt' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add to My Ingredients' })).toHaveLength(3);
  });

  it('draws no Edit where the page gives none', () => {
    render(<Cards {...props()} />);
    expect(screen.queryAllByRole('link', { name: /^Edit / })).toHaveLength(0);
  });

  // M12.5: the Quick Look eye, at each card's foot, for everyone, a visitor included.
  it('draws Quick Look, named for the entry, on each card the page gives a details address', () => {
    const looked = ENTRIES.map((one) => ({
      ...one,
      details: {
        href: `/compendium?entry=${one.id}` as Route,
        heading: { eyebrow: 'Ingredient', title: one.name },
      },
    }));
    render(<Cards {...props({ entries: looked })} />);
    const hrefs = screen
      .getAllByRole('link', { name: /^Quick Look / })
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(looked.map(({ details }) => details.href));
    expect(
      screen.getByRole('link', { name: 'Quick Look Testwort, Fixtura alteralis' }),
    ).toBeInTheDocument();
  });

  it('draws no Quick Look where the page gives no details address', () => {
    render(<Cards {...props()} />);
    expect(screen.queryAllByRole('link', { name: /^Quick Look / })).toHaveLength(0);
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
