import type { Route } from 'next';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import GrimoireList from '@/components/GrimoireList';
import type { GrimoireListProps } from '@/components/GrimoireList/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { filterForm, sent } from '../../support/filter-form';
import { Navigating } from '../../support/navigating';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A coven's Grimoire list (M10.11): a card per spell in the list named Grimoire, the title
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

const OPEN = { moonPhases: [], daysOfWeek: [], visibilities: [], makers: [] };

const props = (over: Partial<GrimoireListProps> = {}): GrimoireListProps => ({
  path: PATH,
  workspaceId: 'w1',
  covenSlug: 'fixture-coven',
  status: 'complete',
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
      { value: 'workspace', label: 'Shared with the Coven', count: 1 },
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

  it('lists each spell as an item of the Grimoire list, named by its title', () => {
    render(<List {...props()} />);
    const list = screen.getByRole('list', { name: 'Grimoire' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByRole('listitem', { name: 'Fixture Working' })).toBeInTheDocument();
    expect(within(list).getByRole('listitem', { name: 'Testwort Charm' })).toBeInTheDocument();
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
      expect(screen.getByRole('list', { name: 'Grimoire' })).toHaveAttribute(
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
    expect(screen.queryByRole('list', { name: 'Grimoire' })).toBeNull();
  });

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
    expect(sent(form)).toBe('query=hearth');
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

  describe('the four facets (M13.22)', () => {
    const open = () => {
      fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    };
    // Moon Phase, Day of Week and Coven Member type to narrow; Visibility is the select-style box.
    const show = (field: string) => {
      const box = screen.getByRole('combobox', { name: field });
      if (field === 'Visibility') {
        fireEvent.click(box);
        return;
      }
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

    it('applies a moon phase, a day, a visibility and a member picked in the panel to the address', async () => {
      render(
        <Navigating push={router.push}>
          <List {...props()} />
        </Navigating>,
      );
      open();
      await pick('Moon Phase', /^Waxing Crescent/);
      await pick('Day of Week', /^Friday/);
      await pick('Visibility', /^Private/);
      expect(
        screen.getByRole('button', { name: 'Remove Visibility: Private' }),
      ).toBeInTheDocument();
      await pick('Coven Member', /^Fixture Member/);
      const params = await apply();
      expect(params.getAll('moonPhase')).toEqual(['Waxing Crescent']);
      expect(params.getAll('dayOfWeek')).toEqual(['Friday']);
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
      show('Moon Phase');
      expect(screen.getByRole('option', { name: /^Waxing Crescent\D*2/ })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /^Full/ })).not.toBeInTheDocument();
    });

    it('offers both visibilities and names the shared one for the coven', () => {
      render(
        <Navigating push={router.push}>
          <List {...props()} />
        </Navigating>,
      );
      open();
      show('Visibility');
      expect(screen.getByRole('option', { name: /^Private/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /^Shared with the Coven/ })).toBeInTheDocument();
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
              visibilities: ['workspace'],
              makers: ['u1'],
            },
          })}
        />,
      );
      expect(screen.getByRole('button', { name: /^Filters.*3/ })).toBeInTheDocument();
      expect(document.body).toHaveTextContent(
        /in the moon phase Waxing Crescent, that are shared with the coven, made by Fixture Member/,
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
});
