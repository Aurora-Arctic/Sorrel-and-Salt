import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { type ReactElement, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PUBLIC_COMPENDIUM_PATH,
  compendiumHref,
  covenIngredientsHref,
} from '@/components/CompendiumList/href';
import type {
  CompendiumFacetCounts,
  CompendiumListFilter,
} from '@/components/CompendiumList/types';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { COMPENDIUM_PARAMS } from '@/components/CompendiumList/params';
import {
  applyFilters,
  answerCounts,
  CATEGORIES,
  escape,
  FACETS,
  FilterRow,
  FORMS,
  listStatus,
  nameBox,
  NO_FILTER,
  openPanel,
  panel,
  props,
  readyFilterRow,
  row,
  SEARCHED,
  SHOWN,
  typedLine,
  typedSentence,
  typing,
  typingClock,
  unsourcedSwitch,
  WARDS,
} from '../../support/compendium-list';
import { drawnOnServer, filterForm, sent } from '../../support/filter-form';
import { waitFor } from '../../support/ingredient-form';
import { typeIn } from '../../support/interact';
import { mockGraphQLQuery } from '../../support/msw/graphql';
import { Navigating } from '../../support/navigating';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The compendium's filter row and its search sentence, drawn without the table beneath them, as IngredientSearch draws them above it.
// What the list does while a filter is on its way, giving way to its status, is index.test.tsx's, since only it renders the table.

/** The compendium's page as the App Router draws it: the row under the filter its address shows, which a push changes inside the row's transition, as Next renders the new page. */
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
  return <FilterRow {...props({ filter })} />;
}

// The filter row: the name search, then the Filters button with the panel of facets.
// Every address it pushes carries the name typed and every facet shown.
describe('CompendiumList filter', () => {
  readyFilterRow(router.push);
  const pushed = () => new URL(router.push.mock.lastCall![0], 'http://localhost').searchParams;
  /** The form's fields as the browser would send them. */
  const fields = (form: HTMLElement) => new URLSearchParams(sent(form));

  it.each(['admin', 'public'] as const)('draws no Compact switch in the %s list', (audience) => {
    render(<FilterRow {...props()} audience={audience} />);
    expect(screen.queryByRole('switch', { name: 'Compact' })).toBeNull();
  });

  // The server draws the panel open inside the GET form, each facet a native control, so the
  // whole filter submits before any script runs.
  it('sends the name and every facet from the form the server drew, categories included', () => {
    const { container } = drawnOnServer(
      <FilterRow
        {...props({
          filter: { ...SHOWN, categories: ['testward', 'testcraft'], categoryMode: 'any' },
        })}
      />,
    );
    const served = filterForm('Filter the Compendium', within(container));

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
      <FilterRow
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

  it('pushes nothing when the panel closes with nothing changed', () => {
    render(<FilterRow {...props({ filter: SHOWN })} />);
    openPanel();

    escape();

    expect(router.push).not.toHaveBeenCalled();
  });

  // Each toggle is written as 1 and, turned off, left out of the address, beside the facets shown.
  it.each([
    {
      toggle: 'No Refs',
      on: '/admin/compendium?withoutReferences=1',
      shown: SHOWN,
      off: '/admin/compendium?query=test&forms=Fixture+Oil',
    },
    {
      toggle: 'No Form',
      on: '/admin/compendium?withoutForms=1',
      shown: { ...SHOWN, withoutForms: true },
      off: '/admin/compendium?query=test&forms=Fixture+Oil&withoutReferences=1',
    },
  ])('writes $toggle as 1 and the toggle off by leaving it out', ({ toggle, on, shown, off }) => {
    const facets = { ...FACETS, withoutForms: 3 };
    const flip = () =>
      fireEvent.click(screen.getByRole('switch', { name: new RegExp(`^${toggle}`) }));
    const { unmount } = render(<FilterRow {...props({ facets })} />);
    openPanel();
    flip();
    escape();
    expect(router.push).toHaveBeenLastCalledWith(on);
    unmount();

    render(<FilterRow {...props({ facets, filter: shown })} />);
    openPanel();
    flip();
    escape();
    expect(router.push).toHaveBeenLastCalledWith(off);
  });

  // filter would list, and the panel shows the answer before anything is applied.
  it('updates a count in the panel after a change, before Apply', async () => {
    answerCounts(7);
    render(<FilterRow {...props({ facets: { ...FACETS, withoutReferences: 2 } })} />);
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
    render(<FilterRow {...props()} />);
    openPanel();
    const forms = within(panel()).getByRole('combobox', { name: 'Forms' });

    fireEvent.click(forms);
    fireEvent.click(screen.getByRole('option', { name: 'Fixture Oil 3' }));
    await screen.findByRole('switch', { name: 'No Refs 5' });

    fireEvent.change(forms, { target: { value: 'Fixture Pow' } });
    expect(await screen.findByRole('option', { name: 'Fixture Powder 2' })).toBeInTheDocument();
  });

  it('applies Clear All beside the Filters button at once, and Clear All in the panel too', () => {
    const { unmount } = render(<FilterRow {...props({ filter: SHOWN })} />);
    fireEvent.click(screen.getAllByRole('link', { name: 'Clear All' })[0]);
    expect(router.push.mock.calls).toEqual([['/admin/compendium']]);
    unmount();
    router.push.mockReset();

    render(<FilterRow {...props({ filter: SHOWN })} />);
    openPanel();
    fireEvent.click(within(panel()).getByRole('link', { name: 'Clear All' }));
    expect(router.push.mock.calls).toEqual([['/admin/compendium']]);
  });

  it('applies the name on its Search submit with the facets shown', () => {
    render(<FilterRow {...props({ filter: { ...SHOWN, query: '' } })} />);

    fireEvent.change(nameBox(), { target: { value: 'Two words' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(router.push.mock.calls).toEqual([
      ['/admin/compendium?query=Two+words&forms=Fixture+Oil&withoutReferences=1'],
    ]);
  });

  // A pick opens the entry's Quick Look, its details modal,
  // over the list as it stands, the page and the filter kept and the text typed but
  // not searched not applied. Each list keys its details as its own eye does.
  describe('picking a name from the dropdown', () => {
    const PAGE = { after: 'cursor-x' };
    const TESTWORT = {
      id: 'i1',
      slug: 'testwort',
      name: 'Testwort',
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
    };
    const offerTestwort = () => {
      const answer = { pageInfo: { hasNextPage: false }, edges: [{ node: TESTWORT }] };
      mockGraphQLQuery('IngredientSearchMatches', () => ({ compendium: answer }));
      mockGraphQLQuery('IngredientSearchCupboardMatches', () => ({
        workspaceIngredients: {
          ...answer,
          edges: [{ node: { ...TESTWORT, cupboardEntry: null } }],
        },
      }));
    };
    const pickTestwort = async (label: string) => {
      const box = screen.getByRole('combobox', { name: label });
      act(() => box.focus());
      typeIn(box, 'fixt');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });
      fireEvent.click(await screen.findByRole('option', { name: /Testwort/ }));
      await waitFor(() => expect(router.push).toHaveBeenCalled());
    };

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      offerTestwort();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("opens the admin's details by slug over the page and filter shown, not the text typed", async () => {
      render(<FilterRow {...props({ filter: SHOWN })} cursor={PAGE} />);

      await pickTestwort('Name');

      expect(router.push.mock.calls).toEqual([
        [compendiumHref({ ...SHOWN, ...PAGE, entry: 'testwort' })],
      ]);
    });

    it("opens the public compendium's details by id over the page and filter shown", async () => {
      render(<FilterRow {...props({ filter: SHOWN })} audience="public" cursor={PAGE} />);

      await pickTestwort('Name');

      expect(router.push.mock.calls).toEqual([
        [compendiumHref({ ...SHOWN, ...PAGE, entry: 'i1' }, undefined, PUBLIC_COMPENDIUM_PATH)],
      ]);
    });

    it("opens a coven's details by id over its page and filter shown, not the entry's page", async () => {
      const filter = { ...SHOWN, source: 'local' as const };
      render(
        <FilterRow
          {...props({ filter })}
          audience="coven"
          covenSlug="fixture-coven"
          workspaceId="w1"
          cursor={PAGE}
        />,
      );

      await pickTestwort('Name');

      expect(router.push.mock.calls).toEqual([
        [covenIngredientsHref('fixture-coven', { ...filter, ...PAGE, entry: 'i1' })],
      ]);
    });
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
    const { rerender } = render(<FilterRow {...props({ filter: SHOWN })} />);
    openPanel();
    expect(unsourcedSwitch()).toBeChecked();

    rerender(<FilterRow {...props({ filter: { ...SHOWN, withoutReferences: false } })} />);

    expect(unsourcedSwitch()).not.toBeChecked();
  });

  describe('In My Covens on the public list', () => {
    const COVENS = [
      { id: 'coven-w', name: 'Testhollow' },
      { id: 'coven-v', name: 'Testwren' },
    ];
    const publicFilter = (filter: CompendiumListFilter = NO_FILTER) =>
      render(<FilterRow {...props({ filter })} audience="public" covens={COVENS} />);
    const pickCoven = (name: string) => {
      fireEvent.click(within(panel()).getByRole('combobox', { name: 'In My Covens' }));
      fireEvent.click(screen.getByRole('option', { name }));
    };
    const notIn = () =>
      fireEvent.click(
        within(within(panel()).getByRole('group', { name: 'Covens' })).getByRole('radio', {
          name: 'Not In',
        }),
      );

    it('applies a picked coven to the address by id', () => {
      publicFilter();
      openPanel();
      pickCoven('Testwren');
      applyFilters();
      expect(router.push.mock.calls).toEqual([['/compendium?covens=coven-v']]);
    });

    it.each([
      {
        held: 'a picked coven',
        choose: () => pickCoven('Testhollow'),
        sent: [['coven-w'], undefined],
      },
      { held: 'Not In', choose: notIn, sent: [undefined, true] },
    ])('asks for the held counts with $held', async ({ choose, sent: variables }) => {
      const asked: unknown[] = [];
      mockGraphQLQuery('CompendiumFacetCounts', (variables) => {
        asked.push([variables.covenIds, variables.covensNot]);
        return {
          compendiumFacets: {
            forms: [],
            deities: [],
            categories: [],
            zodiacSigns: [],
            celestialBodies: [],
            elements: [],
            toxic: [],
            withoutReferences: 0,
            withoutForms: 0,
          },
        };
      });
      publicFilter();
      openPanel();
      choose();
      await waitFor(() => expect(asked).toContainEqual(variables));
    });

    it('names the picked covens in the search sentence', () => {
      publicFilter({ ...NO_FILTER, covens: ['coven-w', 'coven-v'] });
      expect(listStatus()[0]).toHaveTextContent('held in Testhollow or Testwren');
    });

    it('applies Not In to the address as covensNot=1, keeping the picked covens', () => {
      publicFilter({ ...NO_FILTER, covens: ['coven-w'] });
      openPanel();
      notIn();
      applyFilters();
      expect(router.push.mock.calls).toEqual([['/compendium?covens=coven-w&covensNot=1']]);
    });

    it('says not held in, naming the covens or any of my covens, in the search sentence', () => {
      const { unmount } = publicFilter({ ...NO_FILTER, covens: ['coven-w'], covensNot: true });
      expect(listStatus()[0]).toHaveTextContent('not held in Testhollow');
      unmount();
      publicFilter({ ...NO_FILTER, covensNot: true });
      expect(listStatus()[0]).toHaveTextContent('not held in any of my covens');
    });
  });

  describe('the match mode', () => {
    const twoChosen = { ...NO_FILTER, categories: ['testward', 'testcraft'] };

    it('is applied into the address, keeping the categories', () => {
      render(<FilterRow {...props({ filter: twoChosen })} />);
      openPanel();

      fireEvent.click(
        within(screen.getByRole('group', { name: 'Match' })).getByRole('radio', { name: 'Any' }),
      );
      escape();

      expect(pushed().get('categoryMode')).toBe('any');
      expect(pushed().getAll('categories')).toEqual(['testward', 'testcraft']);
    });

    it('is left out of the address for All, and once fewer than two categories remain', () => {
      render(<FilterRow {...props({ filter: { ...twoChosen, categoryMode: 'any' } })} />);
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

    // The old line backspaced, then the new one typed in full. The ticks write the line to a ref and
    // the render only shows it, so a phase runs to its end in one act and renders once; the next
    // phase's interval starts from that render, so each phase takes its own act.
    const typeOut = async () => {
      await act(() => vi.advanceTimersByTimeAsync(1500));
      await act(() => vi.advanceTimersByTimeAsync(1500));
    };

    it('names a chosen deity, with its tradition only when another deity shares the name', () => {
      const { rerender } = render(
        <FilterRow
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
        <FilterRow
          {...props({ facets: WITH_DEITIES, filter: { ...NO_FILTER, deities: ['hecate-greek'] } })}
        />,
      );
      expect(sentence()).toHaveTextContent('Hecate (Greek)');
    });

    it('names a chosen category by its name, not its slug', () => {
      // A slug that is more than the name in other case, so the name is what the sentence read.
      const categories = [
        ...CATEGORIES,
        { id: 'c-tx', slug: 'test-x-slug', name: 'Testcraft', group: WARDS },
      ];
      render(
        <FilterRow
          {...props({ categories, filter: { ...NO_FILTER, categories: ['test-x-slug'] } })}
        />,
      );

      // The sentence shows categories in lower case.
      expect(sentence()).toHaveTextContent('testcraft');
      expect(sentence()).not.toHaveTextContent('test-x-slug');
    });

    it('drops the previous term from the typed line when the search is cleared', async () => {
      typingClock();
      render(
        <Navigating push={router.push}>
          <FilterRow {...props({ filter: { ...SEARCHED, query: 'oldwort' } })} />
        </Navigating>,
      );
      typeIn(nameBox(), '');
      await act(async () => {
        fireEvent.submit(row());
      });

      expect(pushed().has('query')).toBe(false);
      expect(typing()).toBe(true);
      // The old line is backspaced before the lead is typed: once the lead is whole, the
      // line holds no term.
      await typeOut();
      expect(typedLine()).toContain('Searching for ingredients');
      expect(typedLine()).not.toContain('matching');
    });

    // The whole typed sentence while a search is on its way: the first line and the clauses
    it('drops a facet being removed from the typed sentence, and names the new term and facet', async () => {
      typingClock();
      render(
        <Navigating push={router.push}>
          <FilterRow {...props({ filter: { ...SEARCHED, query: 'oldwort' } })} />
        </Navigating>,
      );
      typeIn(nameBox(), 'newwort');
      openPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Remove Category: Testcraft' }));
      fireEvent.click(unsourcedSwitch());
      await act(async () => {
        applyFilters();
      });

      expect(pushed().get('query')).toBe('newwort');
      expect(pushed().has('categories')).toBe(false);
      expect(typing()).toBe(true);
      await typeOut();
      expect(typedSentence()).toContain('newwort');
      expect(typedSentence()).toContain('without references');
      expect(typedSentence()).not.toContain('oldwort');
      expect(typedSentence()).not.toContain('testcraft');
    });
  });
});
