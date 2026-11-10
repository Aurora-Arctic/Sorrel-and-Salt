import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { router } from '../../support/next-navigation';
import FormIcon from '@/components/FormIcon';
import { compendiumHref } from '@/components/CompendiumList/href';
import type { CompendiumListFilter } from '@/components/CompendiumList/types';
import {
  applyFilters,
  CompendiumList,
  nameBox,
  NO_FILTER,
  openPanel,
  props,
  readyFilterRow,
  row,
  SEARCHED,
  typing,
  typingClock,
  unsourcedSwitch,
} from '../../support/compendium-list';
import { waitFor } from '../../support/ingredient-form';
import { useNavigationState } from '@/lib/navigation';
import { Navigating } from '../../support/navigating';
import { RouteModal, RouteModalProvider } from '@/components/Modal';
import { DETAILS_PLACE } from '@/components/IngredientEntry/details';
import { rowCells } from '../../support/table';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.

// claude-docs/components/compendium-list.md

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

  it('gives each row a switch set to whether it is shown', () => {
    const [shown, hidden] = props().entries;
    render(<CompendiumList {...props({ entries: [shown, { ...hidden, shown: false }] })} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(
      within(rows[1]).getByRole('switch', {
        name: 'Shown in Compendium: Testwort, Fixtura testalis',
      }),
    ).toBeChecked();
    expect(
      within(rows[2]).getByRole('switch', { name: 'Shown in Compendium: Fixture Salt' }),
    ).not.toBeChecked();
  });

  it("shows each entry's categories as chips, the rest behind a +N button", () => {
    render(<CompendiumList {...props()} />);

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    const heads = screen.getAllByRole('columnheader').map((head) => head.textContent);
    expect(heads.indexOf('Categories')).toBe(heads.indexOf('Form') + 1);
    expect(heads.indexOf('Sourcing Score')).toBe(heads.indexOf('Categories') + 1);
    const list = within(rows[1]).getByRole('list', { name: 'Categories' });
    expect(within(list).getByText('Testward')).toBeInTheDocument();
    expect(within(list).getByText('Testcraft')).toBeInTheDocument();
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
    const cells = rowCells(rows[2]);
    expect(cells[heads.indexOf('Categories')]).toHaveTextContent('—');
  });

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
      '/curator/compendium?edit=testwort',
    );
    expect(screen.getByRole('link', { name: 'Edit Fixture Salt' })).toHaveAttribute(
      'href',
      '/curator/compendium?edit=fixture-salt',
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
          <RouteModal place={DETAILS_PLACE} closeHref="/curator/compendium" />
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
    expect(look).toHaveAttribute('href', '/curator/compendium?entry=fixture-salt');
    expect(fireEvent.click(look, { metaKey: true })).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(look);
    });

    expect(router.push.mock.lastCall?.[0]).toBe('/curator/compendium?entry=fixture-salt');
    expect(screen.getByRole('dialog', { name: 'Ingredient, Fixture Salt' })).toBeInTheDocument();
  });

  it('names the entry page it leads to by its address while it loads', async () => {
    let target: unknown;
    function Probe() {
      const state = useNavigationState();
      useEffect(() => {
        target = state.href;
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
    expect(target).toBe('/compendium/ingredients/fixture-salt');
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

  // A filter that matched nothing offers the way back to the whole list: its own address, every filter
  // dropped. A compendium that is empty with no filter has nothing to clear.
  it('offers Clear Filters where a filter matched nothing, back to the list with no filter', () => {
    const filter: CompendiumListFilter = {
      ...NO_FILTER,
      query: 'nothing',
      withoutReferences: true,
    };
    const { unmount } = render(<CompendiumList {...props({ entries: [], filter })} />);
    const state = screen.getByRole('status', { name: 'No Matches' });
    expect(within(state).getByRole('link', { name: 'Clear Filters' })).toHaveAttribute(
      'href',
      compendiumHref(NO_FILTER),
    );
    unmount();

    render(<CompendiumList {...props({ entries: [] })} />);
    expect(screen.queryByRole('link', { name: 'Clear Filters' })).toBeNull();
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
    expect(sentence?.textContent?.length).toBeGreaterThan(bold.join('').length);
  });

  it('bolds nothing when the filter is empty and the compendium itself is', () => {
    const { container } = render(<CompendiumList {...props({ entries: [] })} />);
    expect(container.querySelectorAll('strong')).toHaveLength(0);
  });
});

describe('the sort', () => {
  const heading = (name: string) =>
    screen.getAllByRole('columnheader').find((th) => th.textContent?.startsWith(name))!;

  it('sorts from the Name and Sourcing Score headings alone, by name A to Z while nothing else is asked', () => {
    render(<CompendiumList {...props()} />);

    const sortable = screen
      .getAllByRole('columnheader')
      .filter((th) => within(th).queryByRole('link'));
    expect(sortable.map((th) => th.textContent)).toEqual([
      expect.stringMatching(/^Name/),
      expect.stringMatching(/^Sourcing Score/),
    ]);
    expect(heading('Name')).toHaveAttribute('aria-sort', 'ascending');
    expect(heading('Sourcing Score')).not.toHaveAttribute('aria-sort');
    expect(
      within(heading('Name')).getByRole('link', { name: 'Name, Sorted A to Z' }),
    ).toHaveAttribute('href', '/curator/compendium?sort=name&order=desc');
    expect(
      within(heading('Sourcing Score')).getByRole('link', { name: 'Sourcing Score' }),
    ).toHaveAttribute('href', '/curator/compendium?sort=sourcing_score');
  });

  it("reverses the sourcing score from its heading once sorted by it, and shows each entry's score", () => {
    render(<CompendiumList {...props({ filter: { ...NO_FILTER, sort: 'sourcing_score' } })} />);

    expect(heading('Sourcing Score')).toHaveAttribute('aria-sort', 'ascending');
    expect(heading('Name')).not.toHaveAttribute('aria-sort');
    expect(
      within(heading('Sourcing Score')).getByRole('link', {
        name: 'Sourcing Score, Sorted Lowest First',
      }),
    ).toHaveAttribute('href', '/curator/compendium?sort=sourcing_score&order=desc');
    expect(within(heading('Name')).getByRole('link', { name: 'Name' })).toHaveAttribute(
      'href',
      '/curator/compendium',
    );
    expect(
      within(screen.getByRole('row', { name: /Testwort/ })).getByRole('cell', { name: '36' }),
    ).toBeInTheDocument();
  });

  it('marks the reverse direction and leads back to the first', () => {
    render(
      <CompendiumList
        {...props({ filter: { ...NO_FILTER, sort: 'sourcing_score', order: 'desc' } })}
      />,
    );

    expect(heading('Sourcing Score')).toHaveAttribute('aria-sort', 'descending');
    expect(
      within(heading('Sourcing Score')).getByRole('link', {
        name: 'Sourcing Score, Sorted Highest First',
      }),
    ).toHaveAttribute('href', '/curator/compendium?sort=sourcing_score');
  });

  it("marks no heading under a search's Best Match, and sorts the search by name from Name", () => {
    render(<CompendiumList {...props({ filter: { ...NO_FILTER, query: 'wort' } })} />);

    expect(heading('Name')).not.toHaveAttribute('aria-sort');
    expect(heading('Sourcing Score')).not.toHaveAttribute('aria-sort');
    expect(within(heading('Name')).getByRole('link', { name: 'Name' })).toHaveAttribute(
      'href',
      '/curator/compendium?query=wort&sort=name',
    );
  });

  it('offers every column and direction in the Sort By select, Best Match first under a search, and navigates on a choice', () => {
    router.push.mockReset();
    render(<CompendiumList {...props({ filter: { ...NO_FILTER, query: 'wort' } })} />);

    const select = screen.getByRole('combobox', { name: 'Sort By' });
    expect(select).toHaveTextContent('Best Match');
    fireEvent.click(select);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Best Match',
      'Name, A to Z',
      'Name, Z to A',
      'Sourcing Score, Lowest First',
      'Sourcing Score, Highest First',
    ]);
    fireEvent.click(screen.getByRole('option', { name: 'Sourcing Score, Highest First' }));
    expect(router.push).toHaveBeenCalledWith(
      '/curator/compendium?query=wort&sort=sourcing_score&order=desc',
    );
  });
});

describe('compendiumHref', () => {
  it('keeps the page a modal opens over, the modal last', () => {
    expect(compendiumHref({ after: 'x/y' }, { edit: 'testwort' })).toBe(
      '/curator/compendium?after=x%2Fy&edit=testwort',
    );
    expect(compendiumHref({ before: 'b' }, 'new')).toBe(
      '/curator/compendium?before=b&new=ingredient-compendium',
    );
    expect(compendiumHref({})).toBe('/curator/compendium');
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
      '/curator/compendium?query=test+wort&forms=Fixture+Oil&forms=Fixture+Resin&withoutReferences=1&after=a&edit=x',
    );
    expect(compendiumHref({ elements: ['fire', 'water'], after: 'a' })).toBe(
      '/curator/compendium?elements=fire&elements=water&after=a',
    );
    expect(compendiumHref({ query: 'test', before: 'b' }, 'new')).toBe(
      '/curator/compendium?query=test&before=b&new=ingredient-compendium',
    );
    expect(compendiumHref({ withoutReferences: true })).toBe(
      '/curator/compendium?withoutReferences=1',
    );
  });

  it('writes no blank filter', () => {
    expect(compendiumHref(NO_FILTER)).toBe('/curator/compendium');
  });
});
describe('the list while a filter is on its way', () => {
  readyFilterRow(router.push);

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

    expect(router.push).toHaveBeenCalledWith('/curator/compendium?withoutReferences=1');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(row()).toHaveAttribute('aria-busy', 'true');
    for (const control of controls()) expect(control).toHaveAttribute('aria-disabled', 'true');

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

  it('leaves the sentence settled when a pager end opens another page', async () => {
    render(
      <Navigating push={router.push}>
        <CompendiumList {...props({ filter: SEARCHED, nextHref: '/curator/compendium?after=a' })} />
      </Navigating>,
    );
    expect(typing()).toBe(false);

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: /Next/ }));
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(typing()).toBe(false);
  });

  const details = () =>
    screen.getByText(/^(Show|Hide) Search Details$/).closest('details') as HTMLElement;

  it.each(['closed', 'open'])(
    'leaves a %s sentence as it was, with no slide, from the pager press to the new page',
    async (was) => {
      let arrive = () => {};
      const arrives = new Promise<void>((resolve) => {
        arrive = resolve;
      });
      render(
        <Navigating push={router.push} arrives={arrives}>
          <CompendiumList
            {...props({ filter: SEARCHED, nextHref: '/curator/compendium?after=a' })}
          />
        </Navigating>,
      );
      if (was === 'open') {
        fireEvent.click(screen.getByText('Show Search Details'));
        await waitFor(() => expect(details().hasAttribute('open')).toBe(true));
      }
      const wasOpen = details().hasAttribute('open');
      const seen: boolean[] = [];
      const watch = new MutationObserver(() => seen.push(details().hasAttribute('open')));
      watch.observe(details(), { attributes: true, attributeFilter: ['open'] });

      await act(async () => {
        fireEvent.click(screen.getByRole('link', { name: /Next/ }));
      });
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      await act(async () => {
        arrive();
      });
      expect(screen.getByRole('table')).toBeInTheDocument();
      // Long enough for any slide, hold or net timer to have run.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });
      watch.disconnect();

      expect(seen).toEqual([]);
      expect(details().hasAttribute('open')).toBe(wasOpen);
    },
  );

  it('types the sentence when a filter is applied', async () => {
    typingClock();
    render(
      <Navigating push={router.push}>
        <CompendiumList {...props({ filter: SEARCHED })} />
      </Navigating>,
    );
    expect(typing()).toBe(false);

    openPanel();
    fireEvent.click(unsourcedSwitch());
    await act(async () => {
      applyFilters();
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(typing()).toBe(true);
  });
});
