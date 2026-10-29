import { fireEvent, render, screen, within } from '@testing-library/react';
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
import { filterForm, sent } from '../../support/filter-form';
import { ADD, HELD as HELD_TEXT } from '../../support/cupboard-wording';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The public compendium's cards: a plain link per entry, the forms with their icons,
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
  celestialBodies: [],
  toxic: '',
  reviewed: '',
  covens: [],
  covensNot: false,
};

const FACETS: CompendiumFacetCounts = {
  forms: [],
  deities: [],
  categories: [],
  zodiac: [],
  celestialBodies: [],
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
    /** Any card's plus, and any card's check: each is named by its tip and then its entry. */
    const PLUS = { name: new RegExp(`^${ADD}: `) };
    const HELD = { name: new RegExp(`^${HELD_TEXT}: `) };
    // Two cards' pluses read alike to a screen reader's list of buttons unless each
    // carries its entry, as the pencil beside it does; the two Testworts are told apart by their
    // formal names there too.
    it('holds a plus button on each card not yet held, named Add to My Ingredients and its entry', () => {
      render(<Cards {...props({ action: 'add' })} />);
      const buttons = screen.getAllByRole('button', PLUS);
      expect(buttons.map((button) => button.textContent)).toEqual([
        `${ADD}: Testwort, Fixtura testalis`,
        `${ADD}: Testwort, Fixtura alteralis`,
        `${ADD}: Fixture Salt`,
      ]);
      for (const button of buttons) expect(button).not.toHaveAttribute('aria-disabled');
      expect(screen.queryByRole('button', HELD)).toBeNull();
    });

    // The owner's calls, 2026-10-20: the check is a status mark, not a link, since the details
    // modal's In Your Cupboards list carries the links to each coven's copy; it is tipped and
    // named In Every Cupboard and its entry (the one noun for "you hold this"; the tip
    // says the name too), a button only to carry its tip, as the entry page's shelf is.
    it('swaps the plus for a check named In Every Cupboard and its entry on a card every coven holds, and no link', () => {
      const held = ENTRIES.map((one, index) => (index === 0 ? { ...one, held: true } : one));
      render(<Cards {...props({ entries: held, action: 'add' })} />);
      expect(screen.getAllByRole('button', PLUS)).toHaveLength(2);
      const mark = screen.getByRole('button', HELD);
      expect(mark).toHaveAccessibleName(`${HELD_TEXT}: Testwort, Fixtura testalis`);
      expect(mark.closest('a')).toBeNull();
      expect(screen.queryByRole('link', HELD)).toBeNull();
    });

    // The owner's call, 2026-10-20: a press opens the check's tip, as a tap does on InfoTip's ⓘ,
    // so it shows on touch, where there is no hover. A click here focuses nothing, so the
    // press alone opens it.
    it('opens the In Every Cupboard tip when the check is pressed', () => {
      const held = ENTRIES.map((one, index) => (index === 0 ? { ...one, held: true } : one));
      render(<Cards {...props({ entries: held, action: 'add' })} />);
      const mark = screen.getByRole('button', HELD);
      const tips = () =>
        screen.queryAllByRole('tooltip', { hidden: true }).map((tip) => tip.textContent);
      expect(tips()).not.toContain(`${HELD_TEXT}: Testwort, Fixtura testalis`);

      fireEvent.click(mark);
      expect(mark).not.toHaveFocus();
      expect(tips()).toContain(`${HELD_TEXT}: Testwort, Fixtura testalis`);
    });

    it('draws neither without a coven to add to', () => {
      const held = ENTRIES.map((one, index) => (index === 0 ? { ...one, held: true } : one));
      render(<Cards {...props({ entries: held, action: 'add', workspaceId: undefined })} />);
      expect(screen.queryByRole('button', PLUS)).toBeNull();
      expect(screen.queryByRole('button', HELD)).toBeNull();
    });

    it('draws neither where the action is none, even for a held entry', () => {
      const held = ENTRIES.map((one) => ({ ...one, held: true }));
      render(<Cards {...props({ entries: held, action: 'none' })} />);
      expect(screen.queryByRole('button', HELD)).toBeNull();
    });
  });

  // A curator's Edit in Compendium, named for the entry, beside Add where the account can add too.
  it('draws Edit in Compendium, named for the entry, on each card the page gives an edit address', () => {
    const editable = ENTRIES.map((one) => ({
      ...one,
      editHref: `/compendium?edit=${one.slug}` as Route,
      editHeading: { eyebrow: 'Edit Compendium Entry', title: one.name },
    }));
    render(<Cards {...props({ entries: editable, action: 'add' })} />);
    const hrefs = screen
      .getAllByRole('link', { name: /^Edit in Compendium / })
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(editable.map(({ editHref }) => editHref));
    expect(
      screen.getByRole('link', { name: 'Edit in Compendium Testwort, Fixtura alteralis' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Edit in Compendium Fixture Salt' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: new RegExp(`^${ADD}: `) })).toHaveLength(3);
    // No coven holds any entry here, so no card has the three dots.
    expect(screen.queryByRole('button', { name: /^More for / })).toBeNull();
  });

  // The owner's call, 2026-10-20: up to three icons, the plus, Edit in Compendium and the three
  // dots, each only where the viewer may use it.
  describe('the foot, by viewer', () => {
    const PLACE = {
      workspaceId: WORKSPACE_ID,
      covenSlug: 'fixture-coven',
      name: 'Fixture Coven',
      canAnnotate: true,
      canMakeOurs: true,
      canRemove: true,
      annotateHref: '/compendium/ingredients/fixture-salt?annotate=fixture-coven' as Route,
    };
    const saltCard = () =>
      screen.getAllByRole('listitem').find((one) =>
        within(one)
          .queryAllByRole('link')
          .some((link) => link.getAttribute('href') === '/compendium/ingredients/fixture-salt'),
      ) as HTMLElement;

    it('gives a signed-out visitor no plus, no Edit and no dots', () => {
      render(<Cards {...props({ action: 'none' })} />);
      expect(screen.queryByRole('button', { name: /^Add to / })).toBeNull();
      expect(screen.queryByRole('link', { name: /^Edit / })).toBeNull();
      expect(screen.queryByRole('button', { name: /^More for / })).toBeNull();
      expect(screen.queryAllByRole('link', { name: /^Quick Look / })).toHaveLength(0);
      expect(screen.queryByRole('link', { name: 'Sign In' })).toBeNull();
    });

    it('gives a member of a coven that holds the entry the dots, and no Edit', () => {
      const entries = ENTRIES.map((one) =>
        one.slug === 'fixture-salt' ? { ...one, places: [PLACE] } : one,
      );
      render(<Cards {...props({ entries, action: 'add' })} />);
      expect(
        within(saltCard()).getByRole('button', { name: 'More for Fixture Salt' }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /^More for / })).toHaveLength(1);
      expect(screen.queryByRole('link', { name: /^Edit / })).toBeNull();
    });

    it('gives a curator who is also a member all three, with Edit before the dots', () => {
      const entries = ENTRIES.map((one) =>
        one.slug === 'fixture-salt'
          ? {
              ...one,
              places: [PLACE],
              editHref: '/compendium?edit=fixture-salt' as Route,
              editHeading: { eyebrow: 'Edit Compendium Entry', title: one.name },
            }
          : one,
      );
      render(<Cards {...props({ entries, action: 'add' })} />);
      const foot = within(saltCard());
      const add = foot.getByRole('button', { name: /^Add to / });
      const edit = foot.getByRole('link', { name: 'Edit in Compendium Fixture Salt' });
      const dots = foot.getByRole('button', { name: 'More for Fixture Salt' });
      const follows = (first: Element, second: Element) =>
        Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
      expect(follows(add, edit)).toBe(true);
      expect(follows(edit, dots)).toBe(true);
    });
  });

  // The Quick Look eye, at each card's foot, for everyone, a visitor included.
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

  it('offers no Classification and no No Refs, and submits to the public page', () => {
    render(<Cards {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    expect(screen.queryByRole('switch', { name: /^No Refs/ })).toBeNull();
    expect(screen.queryByRole('group', { name: /Classification/ })).toBeNull();
    const form = filterForm('Filter the Compendium');
    expect(form).toHaveAttribute('action', '/compendium');
    expect(new URLSearchParams(sent(form)).has('withoutReferences')).toBe(false);
  });

  // The viewer's covens, every role, for the In My Covens field, apart from the
  // writable ones the plus's menu lists; and each card's holding covens, counted on its mark.
  describe('the viewer’s covens (M12.55)', () => {
    const MINE = [
      { id: 'coven-w', name: 'Testhollow' },
      { id: 'coven-v', name: 'Testwren' },
    ];

    it('offers In My Covens with every coven of the viewer’s', () => {
      render(<Cards {...props({ myCovens: MINE })} />);
      fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
      fireEvent.click(screen.getByRole('combobox', { name: 'In My Covens' }));
      expect(screen.getByRole('option', { name: 'Testhollow' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Testwren' })).toBeInTheDocument();
    });

    it('counts and names the covens holding an entry on its plus and on its check', () => {
      const entries = [
        { ...ENTRIES[0], holding: ['Testhollow', 'Testwren'] },
        { ...ENTRIES[1], held: true, holding: ['Testhollow'] },
        ENTRIES[2],
      ];
      render(<Cards {...props({ entries, action: 'add' })} />);
      screen.getByRole('button', {
        name: `${ADD}: Testwort, Fixtura testalis. In 2 covens: Testhollow, Testwren`,
      });
      screen.getByRole('button', {
        name: `${HELD_TEXT}: Testwort, Fixtura alteralis. In 1 coven: Testhollow`,
      });
    });
  });
});
