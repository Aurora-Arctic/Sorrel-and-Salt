import type { Route } from 'next';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import GrimoireList from '@/components/GrimoireList';
import type { GrimoireListProps } from '@/components/GrimoireList/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { GRIMOIRE_PARAMS } from '@/components/GrimoireList/params';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { filterForm, sent } from '../../support/filter-form';
import { waitFor } from '../../support/ingredient-form';
import { typeIn } from '../../support/interact';
import { mockGraphQLQuery } from '../../support/msw/graphql';
import { Navigating } from '../../support/navigating';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A coven's Grimoire list: a card per spell in the list named Grimoire, the title
// search and the Categories filter, and a status region when there is no card to show
// (claude-docs/components/grimoire-list.md).

const client = makeQueryClient();
const List = (props: GrimoireListProps): ReactElement => (
  <QueryClientProvider client={client}>
    <GrimoireList {...props} />
  </QueryClientProvider>
);

const PATH = '/coven/fixture-coven/grimoire' as Route;
const GROUP = { id: 'g1', name: 'Fixture Group', colorDark: '#a0c4ff', colorLight: '#1d3557' };

const OPEN = { moonPhases: [], daysOfWeek: [], visibility: '' as const, makers: [] };

const props = (over: Partial<GrimoireListProps> = {}): GrimoireListProps => ({
  path: PATH,
  workspaceId: 'w1',
  covenSlug: 'fixture-coven',
  status: 'complete',
  canCreate: true,
  spells: [
    {
      id: 's1',
      title: 'Fixture Working',
      intent: 'To test a list.',
      status: 'complete',
      visibility: 'workspace',
      categories: [],
    },
    {
      id: 's2',
      title: 'Testwort Charm',
      intent: null,
      status: 'complete',
      visibility: 'workspace',
      categories: [],
    },
  ],
  filter: { query: '', categories: [], categoryMode: 'all', ...OPEN },
  categories: [
    {
      id: 'c1',
      slug: 'testwarding',
      name: 'Testwarding',
      description: null,
      group: GROUP,
    },
  ],
  facets: {
    moonPhases: [
      { value: 'Waxing Crescent', label: 'Waxing Crescent', count: 2 },
      { value: 'Full', label: 'Full', count: 0 },
    ],
    daysOfWeek: [{ value: 'Friday', label: 'Friday', count: 1 }],
    visibilities: [
      { value: 'private', label: 'Private', count: 1 },
      { value: 'workspace', label: 'Shared', count: 1 },
    ],
    makers: [{ value: 'u1', label: 'Fixture Member', count: 2 }],
  },
  position: { page: 1, pages: 1 },
  total: 2,
  ...over,
});

describe('GrimoireList', () => {
  beforeEach(() => {
    router.push.mockReset();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  it('lists each spell as an item of the Spells list, its card named by its title', () => {
    render(<List {...props()} />);
    const list = screen.getByRole('list', { name: 'Spells' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByRole('article', { name: 'Fixture Working' })).toBeInTheDocument();
    expect(within(list).getByRole('article', { name: 'Testwort Charm' })).toBeInTheDocument();
  });

  it('names the list Drafts on the Drafts tab', () => {
    render(<List {...props({ status: 'draft' })} />);
    expect(screen.getByRole('list', { name: 'Drafts' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Spells' })).not.toBeInTheDocument();
  });

  it('leaves each item unnamed, so the title is heard once, on its card', () => {
    render(<List {...props()} />);
    const items = within(screen.getByRole('list', { name: 'Spells' })).getAllByRole('listitem');
    for (const item of items) expect(item).not.toHaveAccessibleName();
  });

  it("links each card's title to the spell's recipe page", () => {
    render(<List {...props()} />);
    expect(screen.getByRole('link', { name: /Fixture Working/ })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/grimoire/s1',
    );
    expect(screen.getByRole('link', { name: /Testwort Charm/ })).toHaveAttribute(
      'href',
      '/coven/fixture-coven/grimoire/s2',
    );
  });

  describe('Compact', () => {
    const html = document.documentElement;
    afterEach(() => {
      cleanup(); // unmount first, so clearing the attribute reaches no mounted switch
      html.removeAttribute('data-card-density');
      window.localStorage.clear();
    });

    it('offers the Compact switch in the filter row, on by default, and draws the cards compact', () => {
      render(<List {...props()} />);
      const control = screen.getByRole('switch', { name: 'Compact' });
      expect(control).toBeChecked();
      expect(screen.getByRole('list', { name: 'Spells' })).toHaveAttribute(
        'data-density',
        'compact',
      );
    });

    it('turning it off writes the one stored choice the Ingredients list reads', () => {
      render(<List {...props()} />);
      fireEvent.click(screen.getByRole('switch', { name: 'Compact' }));
      expect(html.getAttribute('data-card-density')).toBe('regular');
      expect(window.localStorage.getItem('card-density')).toBe('regular');
    });

    it('starts off when the page already carries a stored regular choice', () => {
      html.setAttribute('data-card-density', 'regular');
      render(<List {...props()} />);
      expect(screen.getByRole('switch', { name: 'Compact' })).not.toBeChecked();
    });
  });

  it('says there are no spells, and no list, when the tab holds none and no filter is in force', () => {
    render(<List {...props({ spells: [], total: 0, position: undefined })} />);
    expect(screen.getByRole('status', { name: 'No Spells' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'No Matches' })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Spells' })).toBeNull();
  });

  // A viewer, who cannot write a spell, is told which roles can, as an empty cupboard tells them. The
  // roles named are the state's data: nothing else tells a viewer who to ask, and a member is not told.
  it.each([
    ['complete', 'No Spells'],
    ['draft', 'No Drafts'],
  ] as const)(
    'names, to a viewer only, the roles that can write a spell on an empty %s tab',
    (status, name) => {
      const empty = { status, spells: [], total: 0, position: undefined };
      const { unmount } = render(<List {...props({ ...empty, canCreate: false })} />);
      const state = () => screen.getByRole('status', { name });
      expect(state()).toHaveTextContent(/\bmember\b/i);
      expect(state()).toHaveTextContent(/\bowner\b/i);
      unmount();
      render(<List {...props(empty)} />);
      expect(state()).not.toHaveTextContent(/\bmember\b|\bowner\b/i);
    },
  );

  it('names the drafts tab in its empty region', () => {
    render(
      <List
        {...props({
          status: 'draft',
          path: `${PATH}/drafts` as Route,
          spells: [],
          total: 0,
          position: undefined,
        })}
      />,
    );
    expect(screen.getByRole('status', { name: 'No Drafts' })).toBeInTheDocument();
  });

  it('says nothing matched, rather than that there are none, when a filter is in force', () => {
    render(
      <List
        {...props({
          spells: [],
          total: 0,
          position: undefined,
          filter: { query: 'nothing', categories: [], categoryMode: 'all', ...OPEN },
        })}
      />,
    );
    expect(screen.getByRole('status', { name: 'No Matches' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'No Spells' })).toBeNull();
  });

  it("searches by title from its own tab's address", () => {
    render(
      <List
        {...props({ filter: { query: 'hearth', categories: [], categoryMode: 'all', ...OPEN } })}
      />,
    );
    const form = filterForm('Filter the Grimoire');
    expect(form).toHaveAttribute('action', PATH);
    expect(within(form).getByRole('combobox', { name: 'Title' })).toHaveValue('hearth');
    // Any submits an empty value, which the address reads as no filter, as the compendium's Toxic does.
    expect(sent(form)).toBe('query=hearth&visibility=');
  });

  it('applies a category picked in the panel to the tab address, as its slug', async () => {
    render(
      <Navigating push={router.push}>
        <List {...props()} />
      </Navigating>,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    const box = screen.getByRole('combobox', { name: 'Category' });
    box.focus();
    fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
    fireEvent.click(screen.getByRole('option', { name: /^Testwarding/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
    });

    const pushed = new URL(router.push.mock.lastCall![0], 'http://localhost');
    expect(pushed.pathname).toBe(PATH);
    expect(pushed.searchParams.getAll('categories')).toEqual(['testwarding']);
  });

  it('offers each category with how many spells it holds, and no category that holds none', () => {
    const category = (slug: string, name: string, count: number) => ({
      id: slug,
      slug,
      name,
      description: null,
      group: GROUP,
      count,
    });
    render(
      <Navigating push={router.push}>
        <List
          {...props({
            categories: [
              category('testwarding', 'Testwarding', 3),
              category('testmending', 'Testmending', 0),
            ],
          })}
        />
      </Navigating>,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    screen.getByRole('combobox', { name: 'Category' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));

    expect(screen.getByRole('option', { name: /^Testwarding\D*3/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Testmending/ })).not.toBeInTheDocument();
  });

  describe('the four facets', () => {
    const open = () => {
      fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    };
    // Moon Phases, Days of the Week and Coven Members type to narrow; Visibility is a chip of radios.
    const show = (field: string) => {
      const box = screen.getByRole('combobox', { name: field });
      box.focus();
      fireEvent.keyDown(box, { key: 'ArrowDown' });
    };
    const pick = async (field: string, option: RegExp) => {
      await act(async () => show(field));
      await act(async () => {
        fireEvent.click(screen.getByRole('option', { name: option }));
      });
    };
    const apply = async () => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
      });
      return new URL(router.push.mock.lastCall![0], 'http://localhost').searchParams;
    };

    it('applies a moon phase and a day picked in the panel to the address', async () => {
      render(
        <Navigating push={router.push}>
          <List {...props()} />
        </Navigating>,
      );
      open();
      await pick('Moon Phases', /^Waxing Crescent/);
      await pick('Days of the Week', /^Friday/);
      const params = await apply();
      expect(params.getAll('moonPhase')).toEqual(['Waxing Crescent']);
      expect(params.getAll('dayOfWeek')).toEqual(['Friday']);
    });

    it('applies a visibility and a member picked in the panel to the address', async () => {
      render(
        <Navigating push={router.push}>
          <List {...props()} />
        </Navigating>,
      );
      open();
      await pick('Coven Members', /^Fixture Member/);
      fireEvent.click(
        within(screen.getByRole('group', { name: 'Visibility' })).getByRole('radio', {
          name: 'Private 1',
        }),
      );
      const params = await apply();
      expect(params.getAll('visibility')).toEqual(['private']);
      expect(params.getAll('maker')).toEqual(['u1']);
    });

    it('offers a value with its count, and leaves out one that holds no spell', () => {
      render(
        <Navigating push={router.push}>
          <List {...props()} />
        </Navigating>,
      );
      open();
      show('Moon Phases');
      expect(screen.getByRole('option', { name: /^Waxing Crescent\D*2/ })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /^Full/ })).not.toBeInTheDocument();
    });

    it('offers Any, Private and Shared with their counts, resting on Any', () => {
      render(
        <Navigating push={router.push}>
          <List {...props()} />
        </Navigating>,
      );
      open();
      const visibility = within(screen.getByRole('group', { name: 'Visibility' }));
      expect(visibility.getByRole('radio', { name: 'Any' })).toBeChecked();
      expect(visibility.getByRole('radio', { name: 'Private 1' })).toBeInTheDocument();
      expect(visibility.getByRole('radio', { name: 'Shared 1' })).toBeInTheDocument();
    });

    it('leaves visibility out of the address when Any is chosen again', async () => {
      render(
        <Navigating push={router.push}>
          <List
            {...props({
              filter: {
                query: '',
                categories: [],
                categoryMode: 'all',
                ...OPEN,
                visibility: 'private',
              },
            })}
          />
        </Navigating>,
      );
      open();
      fireEvent.click(
        within(screen.getByRole('group', { name: 'Visibility' })).getByRole('radio', {
          name: 'Any',
        }),
      );
      const params = await apply();
      expect(params.has('visibility')).toBe(false);
    });

    it('rests on Any, disabled, when Private or Shared holds no spell', () => {
      render(
        <Navigating push={router.push}>
          <List
            {...props({
              facets: {
                ...props().facets,
                visibilities: [
                  { value: 'private', label: 'Private', count: 0 },
                  { value: 'workspace', label: 'Shared', count: 2 },
                ],
              },
            })}
          />
        </Navigating>,
      );
      open();
      const chip = within(screen.getByRole('group', { name: 'Visibility' })).getByRole('button', {
        name: /Any/,
      });
      expect(chip).toBeDisabled();
    });

    it('names each box in the plural, as it takes several, and says when it has none to offer', () => {
      render(
        <Navigating push={router.push}>
          <List {...props({ facets: { ...props().facets, makers: [] } })} />
        </Navigating>,
      );
      open();
      const members = screen.getByRole('combobox', { name: 'Coven Members' });
      expect(members).toHaveAttribute('placeholder', 'No Coven Members');
      expect(screen.getByRole('combobox', { name: 'Days of the Week' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Show Moon Phases suggestions' }),
      ).toBeInTheDocument();
    });

    it('draws the icon of a moon phase beside it in the list', () => {
      render(
        <Navigating push={router.push}>
          <List {...props()} />
        </Navigating>,
      );
      open();
      show('Moon Phases');
      expect(
        screen.getByRole('option', { name: /^Waxing Crescent/ }).querySelector('svg'),
      ).not.toBeNull();
    });

    it('counts the facets in the Filters button and says them in the search sentence', () => {
      render(
        <List
          {...props({
            filter: {
              query: '',
              categories: [],
              categoryMode: 'all',
              moonPhases: ['Waxing Crescent'],
              daysOfWeek: [],
              visibility: 'workspace',
              makers: ['u1'],
            },
          })}
        />,
      );
      expect(screen.getByRole('button', { name: /^Filters.*3/ })).toBeInTheDocument();
      expect(document.body).toHaveTextContent(
        /in the moon phase Waxing Crescent, that are shared, made by Fixture Member/,
      );
    });

    it('says nothing matched, not that there are none, when only a facet is in force', () => {
      render(
        <List
          {...props({
            spells: [],
            total: 0,
            position: undefined,
            filter: { query: '', categories: [], categoryMode: 'all', ...OPEN, makers: ['u1'] },
          })}
        />,
      );
      expect(screen.getByRole('status', { name: 'No Matches' })).toBeInTheDocument();
    });
  });
  // A picked title opens the spell's Quick Look over the list as it stands, as the
  // card's eye does, the page and the filter kept and the text typed and not searched not applied.
  describe('picking a title from the dropdown', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockGraphQLQuery('GrimoireSearchMatches', () => ({
        grimoire: {
          pageInfo: { hasNextPage: false },
          edges: [{ node: { id: 's9', title: 'Hearth Ward' } }],
        },
      }));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("opens the spell's Quick Look over the page and filter shown, not its recipe page", async () => {
      const filter = {
        query: '',
        categories: [],
        categoryMode: 'all' as const,
        ...OPEN,
        moonPhases: ['Full'],
      };
      const cursor = { after: 'cursor-x' };
      render(<List {...props({ filter, cursor })} />);

      const box = screen.getByRole('combobox', { name: 'Title' });
      act(() => box.focus());
      typeIn(box, 'hearth');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });
      fireEvent.click(await screen.findByRole('option', { name: 'Hearth Ward' }));
      await waitFor(() => expect(router.push).toHaveBeenCalled());

      expect(router.push.mock.calls).toEqual([
        [`${GRIMOIRE_PARAMS.href(PATH, filter, cursor)}&spell=s9`],
      ]);
    });
  });
});
