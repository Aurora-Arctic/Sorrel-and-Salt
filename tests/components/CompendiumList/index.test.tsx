import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { type ReactElement, useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import CompendiumListBase from '@/components/CompendiumList';
import IngredientSearch from '@/components/IngredientSearch';
import AudienceFilter from '@/components/CompendiumList/filter';
import FormIcon from '@/components/FormIcon';
import { compendiumHref } from '@/components/CompendiumList/href';
import type {
  CompendiumFacetCounts,
  CompendiumListEntry,
  CompendiumListFilter,
  CompendiumListProps,
} from '@/components/CompendiumList/types';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { COMPENDIUM_PARAMS } from '@/components/CompendiumList/params';
import { makeQueryClient } from '@/lib/graphql-client';
import { drawnOnServer, sent } from '../../support/filter-form';
import { waitFor } from '../../support/ingredient-form';
import { typeIn } from '../../support/interact';
import { mockGraphQLQuery } from '../../support/msw/graphql';
import { useNavigationState } from '@/lib/navigation';
import { Navigating } from '../../support/navigating';
import { RouteModal, RouteModalProvider } from '@/components/Modal';
import { DETAILS_PLACE } from '@/components/IngredientEntry/details';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// `/admin/compendium`'s filter, table and pager (M5.5): each entry with its
// formal name and live forms, an Edit link opening it in the page's modal, the
// filter that narrows them to the admin's to-do lists, and the pager
// (claude-docs/components/compendium-list.md).

// The Name box is IngredientSearch's type-ahead, which asks the server through
// TanStack Query, so every render sits under a client, as the app's providers give it.
const client = makeQueryClient();
const CompendiumList = (listProps: CompendiumListProps): ReactElement => (
  <QueryClientProvider client={client}>
    <CompendiumListBase {...listProps} />
  </QueryClientProvider>
);

const WARDS = {
  id: 'g-ward',
  name: 'Fixture Wards',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
};
const ENTRIES: CompendiumListEntry[] = [
  {
    id: 'i1',
    updatedBy: 'Fixture Editor',
    updatedAt: new Date('2026-05-06T10:00:00Z'),
    name: 'Testwort',
    slug: 'testwort',
    nomenclature: 'botanical',
    canonicalName: 'Fixtura testalis',
    forms: [
      { name: 'Fixture Herb', icon: 'botanical' },
      { name: 'Fixture Oil', icon: null },
    ],
    categories: [
      { category: { id: 'c-tw', name: 'Testward' }, group: WARDS },
      { category: { id: 'c-tc', name: 'Testcraft' }, group: WARDS },
      { category: { id: 'c-tb', name: 'Testbane' }, group: WARDS },
    ],
    editHref: compendiumHref({}, { edit: 'testwort' }),
    editHeading: { eyebrow: 'Edit Ingredient', title: 'Testwort' },
    details: {
      href: compendiumHref({ entry: 'testwort' }),
      heading: { eyebrow: 'Ingredient', title: 'Testwort' },
    },
  },
  {
    id: 'i2',
    updatedBy: 'Fixture Editor',
    updatedAt: new Date('2026-05-06T10:00:00Z'),
    name: 'Fixture Salt',
    slug: 'fixture-salt',
    nomenclature: 'unknown',
    canonicalName: null,
    forms: [],
    categories: [],
    editHref: compendiumHref({}, { edit: 'fixture-salt' }),
    editHeading: { eyebrow: 'Edit Ingredient', title: 'Fixture Salt' },
    details: {
      href: compendiumHref({ entry: 'fixture-salt' }),
      heading: { eyebrow: 'Ingredient', title: 'Fixture Salt' },
    },
  },
];

/**
 * The list's loading status, the skeleton's: the Form type-ahead holds a
 * status of its own, inside the filter's search landmark.
 */
const listStatus = () =>
  screen.queryAllByRole('status').filter((status) => !status.closest('search'));

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

/** Every filter in use, as a page shows it. */
const SHOWN: CompendiumListFilter = {
  query: 'test',
  forms: ['Fixture Oil'],
  withoutReferences: true,
  withoutForms: false,
  elements: [],
  categories: [],
  categoryMode: 'all',
  deities: [],
  zodiac: [],
  planets: [],
  toxic: '',
};

/** The categories the Categories box offers, each with the slug the address carries. */
const CATEGORIES = [
  { id: 'c-tw', slug: 'testward', name: 'Testward', group: WARDS },
  { id: 'c-tc', slug: 'testcraft', name: 'Testcraft', group: WARDS },
  { id: 'c-tb', slug: 'testbane', name: 'Testbane', group: WARDS },
];

/** The facets the page reads: the curated forms the Form box offers, each with its count. */
const FORMS = [
  { value: 'Fixture Oil', label: 'Fixture Oil', count: 3, icon: null },
  { value: 'Fixture Powder', label: 'Fixture Powder', count: 2, icon: null },
  { value: 'Fixture Resin', label: 'Fixture Resin', count: 1, icon: null },
];
const FACETS: CompendiumFacetCounts = {
  forms: FORMS,
  deities: [],
  categories: CATEGORIES.map(({ slug, name, group }, i) => ({
    value: slug,
    label: name,
    count: i + 1,
    group,
  })),
  zodiac: [],
  planets: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
  withoutForms: 0,
};

const props = (overrides: Partial<CompendiumListProps> = {}): CompendiumListProps => ({
  entries: ENTRIES,
  filter: NO_FILTER,
  facets: FACETS,
  categories: CATEGORIES,
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
  ...overrides,
});

describe('CompendiumList', () => {
  it('lists each entry with its formal name and every live form', () => {
    render(<CompendiumList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByRole('link', { name: 'Testwort' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: 'Fixtura testalis' })).toBeInTheDocument();
    expect(
      within(rows[1]).getByRole('cell', { name: 'Fixture Herb, Fixture Oil' }),
    ).toBeInTheDocument();
    expect(within(rows[2]).getByRole('link', { name: 'Fixture Salt' })).toBeInTheDocument();
  });

  // The dot between two forms is drawn in CSS; a reader still hears a list, and the visible
  // text carries no comma of its own.
  it('separates the forms without a drawn comma, and with a spoken one', () => {
    render(<CompendiumList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    const cell = within(rows[1]).getByRole('cell', { name: 'Fixture Herb, Fixture Oil' });
    const separators = cell.querySelectorAll('.spoken-separator');
    expect(separators).toHaveLength(1);
    expect(separators[0]).toHaveTextContent(',');
    expect(separators[0].parentElement?.firstChild?.textContent).toBe('Fixture Herb');
  });

  // Categories column: the card's chips, the first few shown and the rest behind +N.
  it("shows each entry's categories as chips, the rest behind a +N button", () => {
    render(<CompendiumList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    const heads = screen.getAllByRole('columnheader').map((head) => head.textContent);
    expect(heads.indexOf('Categories')).toBe(heads.indexOf('Form') + 1);
    expect(heads.indexOf('Updated')).toBe(heads.indexOf('Categories') + 1);
    const list = within(rows[1]).getByRole('list', { name: 'Categories' });
    expect(within(list).getByText('Testward')).toBeInTheDocument();
    expect(within(list).getByText('Testcraft')).toBeInTheDocument();
    // The category past the limit waits in the +N button's panel, hidden until it opens.
    const more = within(list).getByRole('button', { name: '1 more category for Testwort' });
    expect(more).toHaveTextContent('+1');
    const panel = document.getElementById(more.getAttribute('aria-controls') ?? '');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(more);
    expect(panel).toHaveAttribute('aria-hidden', 'false');
  });

  it('shows a dash for an entry with no categories', () => {
    render(<CompendiumList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(within(rows[2]).queryByRole('list', { name: 'Categories' })).toBeNull();
    const heads = screen.getAllByRole('columnheader').map((head) => head.textContent);
    const cells = within(rows[2]).getAllByRole('cell');
    expect(cells[heads.indexOf('Categories')]).toHaveTextContent('—');
  });

  // M12.7: each form wears its group's icon; a form with none wears the spoon.
  it('draws each form with its group icon in the Form column', () => {
    const { container: botanical } = render(<FormIcon name="botanical" />);
    const { container: spoon } = render(<FormIcon name={null} />);
    render(<CompendiumList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    const cell = within(rows[1]).getByRole('cell', { name: 'Fixture Herb, Fixture Oil' });
    const glyphs = [...cell.querySelectorAll('svg')].map((svg) => svg.innerHTML);
    expect(glyphs).toEqual([
      botanical.querySelector('svg')!.innerHTML,
      spoon.querySelector('svg')!.innerHTML,
    ]);
  });

  // MB.260: who last edited each row, and when, as the coven's member list has it.
  it('shows who last edited each row and when in an Updated column', () => {
    render(<CompendiumList {...props()} />);

    expect(screen.getByRole('columnheader', { name: 'Updated' })).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /Testwort/ });
    expect(within(row).getByText('Fixture Editor')).toBeInTheDocument();
    expect(within(row).getByText('2026-05-06')).toHaveAttribute(
      'datetime',
      '2026-05-06T10:00:00.000Z',
    );
  });

  it('links each row to its edit modal, named for the entry and its formal name', () => {
    render(<CompendiumList {...props()} />);

    expect(screen.getByRole('link', { name: 'Edit Testwort, Fixtura testalis' })).toHaveAttribute(
      'href',
      '/admin/compendium?edit=testwort',
    );
    expect(screen.getByRole('link', { name: 'Edit Fixture Salt' })).toHaveAttribute(
      'href',
      '/admin/compendium?edit=fixture-salt',
    );
  });

  it("links each name to its entry's public page, by its stored slug", () => {
    render(<CompendiumList {...props()} />);

    const row = screen.getByRole('row', { name: /Testwort/ });
    expect(within(row).getByRole('link', { name: 'Testwort' })).toHaveAttribute(
      'href',
      '/compendium/ingredients/testwort',
    );
    expect(screen.getByRole('link', { name: 'Fixture Salt' })).toHaveAttribute(
      'href',
      '/compendium/ingredients/fixture-salt',
    );
  });

  it("opens an entry's details modal over the list from its Quick Look, the name a plain link to its page", async () => {
    render(
      <Navigating push={router.push}>
        <RouteModalProvider>
          <CompendiumList {...props()} />
          <RouteModal place={DETAILS_PLACE} closeHref="/admin/compendium" />
        </RouteModalProvider>
      </Navigating>,
    );

    const name = screen.getByRole('link', { name: 'Fixture Salt' });
    expect(name).toHaveAttribute('href', '/compendium/ingredients/fixture-salt');
    await act(async () => {
      fireEvent.click(name);
    });
    expect(router.push.mock.lastCall?.[0]).toBe('/compendium/ingredients/fixture-salt');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const look = screen.getByRole('link', { name: 'Quick Look Fixture Salt' });
    expect(look).toHaveAttribute('href', '/admin/compendium?entry=fixture-salt');
    expect(fireEvent.click(look, { metaKey: true })).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(look);
    });

    expect(router.push.mock.lastCall?.[0]).toBe('/admin/compendium?entry=fixture-salt');
    expect(screen.getByRole('dialog', { name: 'Ingredient, Fixture Salt' })).toBeInTheDocument();
  });

  it("names the entry page it leads to, so that page's frame is drawn while it loads", async () => {
    let target: unknown;
    function Probe() {
      const state = useNavigationState();
      useEffect(() => {
        target = state.target;
      });
      return null;
    }
    let arrive = () => {};
    const arrives = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    render(
      <Navigating push={router.push} arrives={arrives}>
        <CompendiumList {...props()} />
        <Probe />
      </Navigating>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Fixture Salt' }), { button: 0 });
    });

    expect(router.push.mock.calls[0]?.[0]).toBe('/compendium/ingredients/fixture-salt');
    expect(target).toEqual({ region: 'main', shape: 'page', frame: 'entry', head: 'eyebrow' });
    await act(async () => arrive());
  });

  it('draws no table when there are none, filtered or not', () => {
    const { rerender } = render(<CompendiumList {...props({ entries: [] })} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    rerender(
      <CompendiumList {...props({ entries: [], filter: { ...NO_FILTER, query: 'nothing' } })} />,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('bolds each filter value in the empty sentence and leaves the joining words plain', () => {
    const filter: CompendiumListFilter = {
      ...NO_FILTER,
      query: 'nothing',
      forms: ['Fixture Oil'],
      withoutReferences: true,
      categories: ['testward', 'testcraft'],
    };
    render(<CompendiumList {...props({ entries: [], filter })} />);

    // The search sentence above bolds its own values; the empty sentence is the one naming the quoted query.
    const sentence = screen.getByText('“nothing”', { selector: 'strong' }).parentElement;
    const bold = [...(sentence?.querySelectorAll('strong') ?? [])].map((each) => each.textContent);
    expect(bold).toEqual(['“nothing”', '“Fixture Oil”', 'No Refs', 'Testward', 'Testcraft']);
    // The sentence is more than its values: what joins them is not bold.
    expect(sentence?.textContent?.length).toBeGreaterThan(bold.join('').length);
  });

  it('bolds nothing when the filter is empty and the compendium itself is', () => {
    const { container } = render(<CompendiumList {...props({ entries: [] })} />);
    expect(container.querySelectorAll('strong')).toHaveLength(0);
  });
});

describe('compendiumHref', () => {
  it('keeps the page a modal opens over, the modal last', () => {
    expect(compendiumHref({ after: 'x/y' }, { edit: 'testwort' })).toBe(
      '/admin/compendium?after=x%2Fy&edit=testwort',
    );
    expect(compendiumHref({ before: 'b' }, 'new')).toBe('/admin/compendium?before=b&new');
    expect(compendiumHref({})).toBe('/admin/compendium');
  });

  it('keeps the filter ahead of the cursor and the modal', () => {
    expect(
      compendiumHref(
        {
          query: 'test wort',
          forms: ['Fixture Oil', 'Fixture Resin'],
          withoutReferences: true,
          after: 'a',
        },
        { edit: 'x' },
      ),
    ).toBe(
      '/admin/compendium?query=test+wort&forms=Fixture+Oil&forms=Fixture+Resin&withoutReferences=1&after=a&edit=x',
    );
    expect(compendiumHref({ elements: ['fire', 'water'], after: 'a' })).toBe(
      '/admin/compendium?elements=fire&elements=water&after=a',
    );
    expect(compendiumHref({ query: 'test', before: 'b' }, 'new')).toBe(
      '/admin/compendium?query=test&before=b&new',
    );
    expect(compendiumHref({ withoutReferences: true })).toBe(
      '/admin/compendium?withoutReferences=1',
    );
  });

  it('writes no blank filter', () => {
    expect(compendiumHref(NO_FILTER)).toBe('/admin/compendium');
  });
});

/**
 * The compendium's page as the App Router draws it: the list under the
 * filter its address shows, which a push changes inside the list's
 * transition, as Next renders the new page.
 */
function RoutedCompendium(): ReactElement {
  const [filter, setFilter] = useState<CompendiumListFilter>(NO_FILTER);
  router.push.mockImplementation((href: string) => {
    const params = new URL(href, 'http://localhost').searchParams;
    // The page reads its address through the table; so does this stand-in.
    setFilter(
      COMPENDIUM_PARAMS.read(
        Object.fromEntries([...new Set(params.keys())].map((name) => [name, params.getAll(name)])),
      ),
    );
  });
  return <CompendiumList {...props({ filter })} />;
}

// The filter row (M12.4): the name search, then the Filters button with the panel of facets.
// Every address it pushes carries the name typed and every facet shown.
describe('CompendiumList filter', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  // The panel opens as it does from the tablet width up, over the results.
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const openPanel = () => fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
  const row = () => screen.getByRole('form', { name: 'Filter the Compendium' });
  const nameBox = () => screen.getByRole('combobox', { name: 'Name' });
  const unsourcedSwitch = () => screen.getByRole('switch', { name: /^No Refs/ });
  const pushed = () => new URL(router.push.mock.lastCall![0], 'http://localhost').searchParams;
  /** The form's fields as the browser would send them. */
  const fields = (form: HTMLElement) => new URLSearchParams(sent(form));
  const panel = () => screen.getByRole('dialog', { name: 'Filters' });
  const escape = () => fireEvent.keyDown(panel(), { key: 'Escape' });
  const applyFilters = () => fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
  /** What the server would answer for the filter held in the panel: only the No Refs count is read. */
  const answerCounts = (withoutReferences: number) =>
    mockGraphQLQuery('CompendiumFacetCounts', () => ({
      compendiumFacets: {
        forms: [],
        deities: [],
        categories: [],
        zodiacSigns: [],
        celestialBodies: [],
        elements: [],
        toxic: [],
        withoutReferences,
        withoutForms: 0,
      },
    }));
  beforeEach(() => answerCounts(0));

  it('draws no Compact switch in the admin list', () => {
    render(<CompendiumList {...props()} />);
    expect(screen.queryByRole('switch', { name: 'Compact' })).toBeNull();
  });

  it('draws no Compact switch in the public list', () => {
    const { filter, facets, categories, vocabulary, total } = props();
    render(
      <QueryClientProvider client={client}>
        <IngredientSearch
          search={
            <AudienceFilter
              audience="public"
              filter={filter}
              facets={facets}
              categories={categories}
              vocabulary={vocabulary}
              total={total}
            />
          }
        >
          {null}
        </IngredientSearch>
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('switch', { name: 'Compact' })).toBeNull();
  });

  it('counts the chosen values on the Filters button, not the name typed', () => {
    const { rerender } = render(
      <CompendiumList {...props({ filter: { ...NO_FILTER, query: 'x' } })} />,
    );
    expect(screen.getByRole('button', { name: /^Filters/ })).toHaveAccessibleName('Filters');

    rerender(
      <CompendiumList
        {...props({
          filter: {
            ...NO_FILTER,
            forms: ['Fixture Oil', 'Fixture Resin'],
            withoutReferences: true,
          },
        })}
      />,
    );
    expect(screen.getByRole('button', { name: /^Filters/ })).toHaveAccessibleName('Filters 3');
  });

  it('offers Clear All, a link to the unfiltered list, only while a facet is in use', () => {
    const { rerender } = render(
      <CompendiumList {...props({ filter: { ...NO_FILTER, query: 'x' } })} />,
    );
    expect(screen.queryByRole('link', { name: 'Clear All' })).not.toBeInTheDocument();

    rerender(<CompendiumList {...props({ filter: SHOWN })} />);
    expect(screen.getByRole('link', { name: 'Clear All' })).toHaveAttribute(
      'href',
      '/admin/compendium',
    );
  });

  // The server draws the panel open inside the GET form, each facet a native control, so the
  // whole filter submits before any script runs.
  it('sends the name and every facet from the form the server drew, categories included', () => {
    const { container } = drawnOnServer(
      <CompendiumList
        {...props({
          filter: { ...SHOWN, categories: ['testward', 'testcraft'], categoryMode: 'any' },
        })}
      />,
    );
    const served = within(container).getByRole('form', { name: 'Filter the Compendium' });

    const categories = within(served).getByRole('listbox', { name: 'Categories' });
    expect(categories).toHaveAttribute('name', 'categories');
    expect(categories).toHaveAttribute('multiple');
    const sentFields = fields(served);
    expect([...(categories as HTMLSelectElement).selectedOptions].map((o) => o.value)).toEqual([
      'testward',
      'testcraft',
    ]);
    expect(sentFields.getAll('forms')).toEqual(['Fixture Oil']);
    expect(sentFields.get('query')).toBe('test');
    expect(sentFields.get('withoutReferences')).toBe('1');
    expect(sentFields.get('categoryMode')).toBe('any');
  });

  // The panel covers the results, so a change in it is held, not applied: the address moves
  // once, when the panel is closed or Apply Filters is pressed.
  it('holds a change in the open panel, and Apply Filters applies them all in one push', () => {
    render(
      <CompendiumList
        {...props({
          filter: { ...SHOWN, elements: ['fire'], categories: ['testward'] },
          nextHref: compendiumHref({ after: 'a' }),
        })}
      />,
    );

    openPanel();
    fireEvent.change(nameBox(), { target: { value: ' Test wort ' } });
    fireEvent.click(unsourcedSwitch());
    expect(router.push).not.toHaveBeenCalled();

    applyFilters();

    expect(router.push).toHaveBeenCalledTimes(1);
    const address = pushed();
    expect(address.get('query')).toBe('Test wort');
    expect(address.getAll('forms')).toEqual(['Fixture Oil']);
    expect(address.getAll('elements')).toEqual(['fire']);
    expect(address.getAll('categories')).toEqual(['testward']);
    expect(address.has('withoutReferences')).toBe(false);
    expect(address.has('after')).toBe(false);
  });

  it('applies what was held when Escape closes the panel, once', () => {
    render(<CompendiumList {...props()} />);
    openPanel();
    fireEvent.click(unsourcedSwitch());
    expect(router.push).not.toHaveBeenCalled();

    escape();

    expect(router.push.mock.calls).toEqual([['/admin/compendium?withoutReferences=1']]);
  });

  it('pushes nothing when the panel closes with nothing changed', () => {
    render(<CompendiumList {...props({ filter: SHOWN })} />);
    openPanel();

    escape();

    expect(router.push).not.toHaveBeenCalled();
  });

  it('writes No Refs as 1 and the toggle off by leaving it out', () => {
    const { unmount } = render(<CompendiumList {...props()} />);
    openPanel();
    fireEvent.click(unsourcedSwitch());
    escape();
    expect(router.push).toHaveBeenLastCalledWith('/admin/compendium?withoutReferences=1');
    unmount();

    render(<CompendiumList {...props({ filter: SHOWN })} />);
    openPanel();
    fireEvent.click(unsourcedSwitch());
    escape();
    expect(router.push).toHaveBeenLastCalledWith('/admin/compendium?query=test&forms=Fixture+Oil');
  });

  it('writes No Form as 1 beside No Refs, and the toggle off by leaving it out', () => {
    const { unmount } = render(
      <CompendiumList {...props({ facets: { ...FACETS, withoutForms: 3 } })} />,
    );
    openPanel();
    const formless = screen.getByRole('switch', { name: 'No Form 3' });
    fireEvent.click(formless);
    escape();
    expect(router.push).toHaveBeenLastCalledWith('/admin/compendium?withoutForms=1');
    unmount();

    render(<CompendiumList {...props({ filter: { ...SHOWN, withoutForms: true } })} />);
    openPanel();
    fireEvent.click(screen.getByRole('switch', { name: /^No Form/ }));
    escape();
    expect(router.push).toHaveBeenLastCalledWith(
      '/admin/compendium?query=test&forms=Fixture+Oil&withoutReferences=1',
    );
  });

  // Counts stay live while the panel is open: each change asks the server what the held
  // filter would list, and the panel shows the answer before anything is applied.
  it('updates a count in the panel after a change, before Apply', async () => {
    answerCounts(7);
    render(<CompendiumList {...props({ facets: { ...FACETS, withoutReferences: 2 } })} />);
    openPanel();
    expect(unsourcedSwitch()).toHaveAccessibleName('No Refs 2');

    fireEvent.click(unsourcedSwitch());

    expect(await screen.findByRole('switch', { name: 'No Refs 7' })).toBeChecked();
    expect(router.push).not.toHaveBeenCalled();
  });

  // The server counts forms with the forms chosen left out of the filter, so the other forms
  // keep their counts; the open panel must offer them while one is held.
  it('still offers the other forms, with their counts, after one is picked before Apply', async () => {
    mockGraphQLQuery('CompendiumFacetCounts', () => ({
      compendiumFacets: {
        forms: FORMS.map(({ value, count }) => ({ value, count })),
        deities: [],
        categories: [],
        zodiacSigns: [],
        celestialBodies: [],
        elements: [],
        toxic: [],
        withoutReferences: 5,
      },
    }));
    render(<CompendiumList {...props()} />);
    openPanel();
    const forms = within(panel()).getByRole('combobox', { name: 'Forms' });

    fireEvent.click(forms);
    fireEvent.click(screen.getByRole('option', { name: 'Fixture Oil 3' }));
    await screen.findByRole('switch', { name: 'No Refs 5' });

    fireEvent.change(forms, { target: { value: 'Fixture Pow' } });
    expect(await screen.findByRole('option', { name: 'Fixture Powder 2' })).toBeInTheDocument();
  });

  it('applies Clear All beside the Filters button at once, and Clear All in the panel too', () => {
    const { unmount } = render(<CompendiumList {...props({ filter: SHOWN })} />);
    fireEvent.click(screen.getAllByRole('link', { name: 'Clear All' })[0]);
    expect(router.push.mock.calls).toEqual([['/admin/compendium']]);
    unmount();
    router.push.mockReset();

    render(<CompendiumList {...props({ filter: SHOWN })} />);
    openPanel();
    fireEvent.click(within(panel()).getByRole('link', { name: 'Clear All' }));
    expect(router.push.mock.calls).toEqual([['/admin/compendium']]);
  });

  it('applies the name on its Search submit with the facets shown', () => {
    render(<CompendiumList {...props({ filter: { ...SHOWN, query: '' } })} />);

    fireEvent.change(nameBox(), { target: { value: 'Two words' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(router.push.mock.calls).toEqual([
      ['/admin/compendium?query=Two+words&forms=Fixture+Oil&withoutReferences=1'],
    ]);
  });

  // The owner's call (M8.10): a pick opens the entry over the list as it
  // stands, so the text typed and not searched is not applied.
  describe('picking a name from the dropdown', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens that entry\x27s modal over the filter shown, not the text typed', async () => {
      mockGraphQLQuery('IngredientSearchMatches', () => ({
        compendium: {
          pageInfo: { hasNextPage: false },
          edges: [
            {
              node: {
                id: 'i1',
                slug: 'testwort',
                name: 'Testwort',
                canonicalName: 'Fixtura testalis',
                nomenclature: 'botanical',
              },
            },
          ],
        },
      }));
      render(<CompendiumList {...props({ filter: SHOWN })} />);

      act(() => nameBox().focus());
      typeIn(nameBox(), 'fixt');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });
      fireEvent.click(await screen.findByRole('option', { name: /Testwort/ }));

      await waitFor(() => expect(router.push).toHaveBeenCalled());
      expect(router.push.mock.calls).toEqual([[compendiumHref(SHOWN, { edit: 'testwort' })]]);
    });
  });

  // While the filtered list reads, the list gives way to the loading status and the row is
  // off: every control `aria-disabled` and the form `aria-busy`, until the new list renders.
  it('turns the row off and the list to a status until the filtered list arrives', async () => {
    let arrive = () => {};
    const arrives = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    render(
      <Navigating push={router.push} arrives={arrives}>
        <CompendiumList {...props()} />
      </Navigating>,
    );
    openPanel();
    // The panel shuts as the navigation starts, so only the row's own controls are read after.
    const controls = () => [nameBox(), screen.getByRole('button', { name: 'Search' })];
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(row()).not.toHaveAttribute('aria-busy');

    fireEvent.click(unsourcedSwitch());
    await act(async () => {
      applyFilters();
    });

    expect(router.push).toHaveBeenCalledWith('/admin/compendium?withoutReferences=1');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(row()).toHaveAttribute('aria-busy', 'true');
    for (const control of controls()) expect(control).toHaveAttribute('aria-disabled', 'true');

    // A submit while the first is on its way goes nowhere.
    fireEvent.submit(row());
    expect(router.push).toHaveBeenCalledTimes(1);

    await act(async () => {
      arrive();
    });

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(row()).not.toHaveAttribute('aria-busy');
    expect(controls().filter((control) => control.hasAttribute('aria-disabled'))).toEqual([]);
  });

  it('leaves the list in place while the name is typed in', () => {
    render(
      <Navigating push={router.push}>
        <CompendiumList {...props()} />
      </Navigating>,
    );

    fireEvent.change(nameBox(), { target: { value: 'test' } });

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(row()).not.toHaveAttribute('aria-busy');
  });

  // The row is not drawn afresh for a facet, so the open panel and the focus in it survive
  // the change; a new name does draw it afresh.
  it('keeps the same form through a facet change, and draws a new one for a new name', async () => {
    render(<RoutedCompendium />);
    const before = row();

    openPanel();
    fireEvent.click(unsourcedSwitch());
    await act(async () => {
      escape();
    });
    expect(row()).toBe(before);
    // The address, not the switch: the panel is sliding shut, and `useSlide`'s
    // fallback timer closes it after 600ms of real time, which a loaded run can
    // pass before this line. The switch is read again once the panel reopens.
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(pushed().get('withoutReferences')).toBe('1');

    fireEvent.change(nameBox(), { target: { value: 'test' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    });
    expect(row()).not.toBe(before);
    expect(nameBox()).toHaveValue('test');
    openPanel();
    expect(unsourcedSwitch()).toBeChecked();
  });

  it('follows the address when it changes under the row, as Back does', () => {
    const { rerender } = render(<CompendiumList {...props({ filter: SHOWN })} />);
    openPanel();
    expect(unsourcedSwitch()).toBeChecked();

    rerender(<CompendiumList {...props({ filter: { ...SHOWN, withoutReferences: false } })} />);

    expect(unsourcedSwitch()).not.toBeChecked();
  });

  describe('the match mode', () => {
    const twoChosen = { ...NO_FILTER, categories: ['testward', 'testcraft'] };

    it('is applied into the address, keeping the categories', () => {
      render(<CompendiumList {...props({ filter: twoChosen })} />);
      openPanel();

      fireEvent.click(
        within(screen.getByRole('group', { name: 'Match' })).getByRole('radio', { name: 'Any' }),
      );
      escape();

      expect(pushed().get('categoryMode')).toBe('any');
      expect(pushed().getAll('categories')).toEqual(['testward', 'testcraft']);
    });

    it('is left out of the address for All, and once fewer than two categories remain', () => {
      render(<CompendiumList {...props({ filter: { ...twoChosen, categoryMode: 'any' } })} />);
      openPanel();

      fireEvent.click(
        within(screen.getByRole('group', { name: 'Match' })).getByRole('radio', { name: 'All' }),
      );
      escape();
      expect(pushed().has('categoryMode')).toBe(false);
      expect(pushed().getAll('categories')).toEqual(['testward', 'testcraft']);

      openPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Remove Category: Testcraft' }));
      escape();
      expect(pushed().has('categoryMode')).toBe(false);
      expect(pushed().getAll('categories')).toEqual(['testward']);
    });
  });

  describe('the search sentence', () => {
    const DEITIES: CompendiumFacetCounts['deities'] = [
      { value: 'hecate-greek', label: 'Hecate', count: 2, tradition: 'Greek' },
      { value: 'hecate-roman', label: 'Hecate', count: 1, tradition: 'Roman' },
      { value: 'janus-roman', label: 'Janus', count: 1, tradition: 'Roman' },
    ];
    const WITH_DEITIES: CompendiumFacetCounts = { ...FACETS, deities: DEITIES };
    // The sentence is the status outside the search landmark, where the comboboxes keep theirs.
    const sentence = () => listStatus()[0];

    it('names a chosen deity, with its tradition only when another deity shares the name', () => {
      const { rerender } = render(
        <CompendiumList
          {...props({
            facets: WITH_DEITIES,
            filter: { ...NO_FILTER, deities: ['hecate-roman', 'janus-roman'] },
          })}
        />,
      );

      expect(sentence()).toHaveTextContent('Hecate (Roman)');
      expect(sentence()).not.toHaveTextContent('Janus (Roman)');
      expect(sentence()).toHaveTextContent('Janus');

      rerender(
        <CompendiumList
          {...props({ facets: WITH_DEITIES, filter: { ...NO_FILTER, deities: ['hecate-greek'] } })}
        />,
      );
      expect(sentence()).toHaveTextContent('Hecate (Greek)');
    });

    it('names a chosen category by its name, not its slug', () => {
      render(
        <CompendiumList {...props({ filter: { ...NO_FILTER, categories: ['testcraft'] } })} />,
      );

      expect(sentence()).toHaveTextContent('Testcraft');
      expect(sentence()).not.toHaveTextContent('testcraft');
    });

    it('holds no link, so a chosen value is removed in the panel alone', () => {
      render(
        <CompendiumList {...props({ filter: { ...NO_FILTER, categories: ['testcraft'] } })} />,
      );

      expect(within(sentence()).queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
