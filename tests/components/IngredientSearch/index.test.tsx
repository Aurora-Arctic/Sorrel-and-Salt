import { act, fireEvent, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientSearch, {
  IngredientSearchForm,
  useSearchText,
} from '@/components/IngredientSearch';
import type { IngredientSearchMatch, SearchSource } from '@/components/IngredientSearch/types';
import { RouteModalContext } from '@/components/Modal/route-modal-provider';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { filterForm } from '../../support/filter-form';
import { renderWithClient, waitFor } from '../../support/ingredient-form';
import { typeIn } from '../../support/interact';
import { mockGraphQLQuery } from '../../support/msw/graphql';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The search shell and its row (M8.10): a type-ahead over the compendium's
// ranked search, whose dropdown follows the debounced text while the list
// changes only on Enter, a pick or the action row
// (claude-docs/components/ingredient-search.md, "Testing").

const PATH = '/compendium';
const searchHref = (text: string) => `${PATH}?query=${encodeURIComponent(text)}` as never;
const pickHref = (match: IngredientSearchMatch) => `${PATH}?edit=${match.slug}` as never;

const match = (n: number): IngredientSearchMatch => ({
  id: `id-${n}`,
  slug: `testwort-${n}`,
  name: `Testwort ${n}`,
  canonicalName: n === 1 ? 'Fixtura testalis' : null,
  nomenclature: 'botanical',
});

/** Every variables object the lookup was asked with, in order. */
let asked: Record<string, unknown>[] = [];

/** Answers the lookup with `matches`, recording what it was asked. */
function offer(matches: IngredientSearchMatch[], hasNextPage = false) {
  asked = [];
  mockGraphQLQuery('IngredientSearchMatches', (variables) => {
    asked.push(variables);
    return {
      compendium: { pageInfo: { hasNextPage }, edges: matches.map((node) => ({ node })) },
    };
  });
}

/** A slot field that reads the text typed, as a filter applying on its change would. */
const SlotField = (): ReactElement => <output aria-label="Typed">{useSearchText()}</output>;

function renderSearch(
  query = '',
  source?: SearchSource,
  opener: typeof pickHref | null = pickHref,
) {
  return renderWithClient(
    <IngredientSearch
      search={
        <IngredientSearchForm
          label="Filter Ingredients"
          action={PATH as never}
          query={query}
          shown={[query]}
          searchHref={searchHref}
          pickHref={opener ?? undefined}
          source={source}
        >
          <SlotField />
        </IngredientSearchForm>
      }
      action={<button type="button">Add Ingredient</button>}
      previousHref={undefined}
      nextHref={`${PATH}?after=x` as never}
      position={{ page: 1, pages: 2 }}
    >
      <p>Results go here</p>
    </IngredientSearch>,
  );
}

const box = () => screen.getByRole('combobox', { name: 'Name' });
const form = () => filterForm('Filter Ingredients');
const status = () => screen.getByRole('status', { name: 'Name results' });

/** Focuses the box and types `text` as one change. */
function typeName(text: string) {
  act(() => box().focus());
  typeIn(box(), text);
}

/** Lets the debounce pass and the lookup answer. */
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  });
  await waitFor(() => expect(asked.length).toBeGreaterThan(0));
}

beforeEach(() => {
  router.push.mockClear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('IngredientSearch', () => {
  it('draws the search, the action, the results and the pager in one list frame', () => {
    renderSearch();

    expect(form()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Ingredient' })).toBeInTheDocument();
    expect(screen.getByText('Results go here')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Next/ })).toHaveAttribute('href', `${PATH}?after=x`);
  });

  it("hides the row's sorrel layer from assistive technology, beside the form", () => {
    const { container } = renderSearch();

    const layer = container.querySelector('search > .filter-sorrel');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer).toBeEmptyDOMElement();
    expect(layer?.parentElement).toBe(form().parentElement);
  });

  it('names the box by its one hidden label', () => {
    renderSearch();

    expect(screen.getAllByText('Name', { selector: 'label' })).toHaveLength(1);
    expect(box()).toHaveAccessibleName('Name');
  });

  it('works before hydration as a GET form to the page, the box sending its text as query', () => {
    renderSearch('wort');

    expect(form()).toHaveAttribute('method', 'get');
    expect(form()).toHaveAttribute('action', PATH);
    expect(box()).toHaveAttribute('name', 'query');
    expect(new FormData(form() as HTMLFormElement).get('query')).toBe('wort');
    expect(screen.getByRole('button', { name: 'Search' })).toHaveAttribute('type', 'submit');
  });

  it('draws the Search submit with no chevron, and a press on it submits the form', () => {
    renderSearch('wort');

    const search = screen.getByRole('button', { name: 'Search' });
    expect(screen.queryByRole('button', { name: /^Show Name/ })).not.toBeInTheDocument();
    const submitted = vi.fn((event: Event) => event.preventDefault());
    form().addEventListener('submit', submitted);
    fireEvent.click(search);
    expect(submitted).toHaveBeenCalledTimes(1);
  });

  it('asks once after the debounce, not on every keystroke', async () => {
    offer([match(1)]);
    renderSearch();

    typeName('wo');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS / 2);
    });
    typeName('wor');
    typeName('wort');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS / 2);
    });
    expect(asked).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    await waitFor(() => expect(asked).toHaveLength(1));
    expect(asked[0]).toEqual({ query: 'wort', first: 25 });
  });

  it('asks nothing until the box is focused', async () => {
    offer([match(1)]);
    renderSearch('wort');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    });

    expect(asked).toHaveLength(0);
  });

  it('asks nothing while the text is under two characters, and announces the floor at once instead of rows', async () => {
    offer([match(1)]);
    renderSearch();

    typeName('w');
    // At once, with no debounce to wait for: nothing is being asked.
    expect(status().textContent).not.toBe('');
    expect(screen.getByText(status().textContent ?? '', { selector: 'div' })).toBeVisible();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    });
    expect(asked).toHaveLength(0);
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('drops the last rows at once when the text falls back under two characters', async () => {
    offer([match(1), match(2)]);
    renderSearch();

    typeName('wo');
    await settle();
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));

    typeName('w');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(status().textContent).not.toBe('');
  });

  it('asks for the first 25 and never a cursor, offering the rows in the server order, at most 25', async () => {
    const many = Array.from({ length: 30 }, (_, i) => match(i + 1));
    offer(many.slice(0, 25), true);
    renderSearch();

    typeName('wort');
    await settle();

    // The 25 results, then the action row (there is another page).
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(26));
    expect(asked.every((variables) => !('after' in variables) && !('before' in variables))).toBe(
      true,
    );
    expect(asked.every((variables) => variables.first === 25)).toBe(true);
    const names = screen.getAllByRole('option').map((option) => option.textContent);
    expect(names[0]).toContain('Testwort 1');
    expect(names[1]).toContain('Testwort 2');
    expect(names[24]).toContain('Testwort 25');
  });

  it('ends the listbox with an action row when there is another page, reached by the arrows and picked by Enter', async () => {
    offer([match(1), match(2)], true);
    renderSearch();

    typeName('wort');
    await settle();
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));

    const last = screen.getAllByRole('option')[2];
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    expect(box()).toHaveAttribute('aria-activedescendant', last.id);
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(router.push.mock.calls).toEqual([[searchHref('wort')]]);
  });

  it('applies the text to the list when the action row is clicked', async () => {
    offer([match(1), match(2)], true);
    renderSearch();

    typeName('wort');
    await settle();
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));

    fireEvent.click(screen.getAllByRole('option')[2]);

    expect(router.push.mock.calls).toEqual([[searchHref('wort')]]);
  });

  it('has no action row when every match is on the first page, and counts only the results when it has', async () => {
    offer([match(1), match(2)], false);
    renderSearch();

    typeName('wort');
    await settle();

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    await waitFor(() => expect(status()).toHaveTextContent('2'));

    offer([match(1), match(2)], true);
    typeName('worts');
    await settle();

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));
    expect(status()).toHaveTextContent('2');
    expect(status()).not.toHaveTextContent('3');
  });

  it('reads the empty message when nothing matches', async () => {
    offer([match(1), match(2)]);
    renderSearch();

    typeName('wort');
    await settle();
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));

    offer([]);
    typeName('zzzz');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
    await waitFor(() => expect(status().textContent).not.toBe(''));
    const message = screen.getByText(status().textContent ?? '', { selector: 'div' });
    expect(message).toBeVisible();
    expect(
      within(screen.getByRole('listbox', { name: 'Name results', hidden: true })).queryByText(
        message.textContent ?? '',
      ),
    ).toBeNull();
  });

  it('opens a picked match without applying the text or leaving the list', async () => {
    offer([match(1), match(2)]);
    renderSearch();

    typeName('wort');
    await settle();
    fireEvent.click(await screen.findByRole('option', { name: /Testwort 2/ }));

    expect(router.push.mock.calls).toEqual([[pickHref(match(2))]]);
    expect(box()).toHaveValue('wort');
    expect(screen.getByText('Results go here')).toBeInTheDocument();
  });

  // The owner's rule of 2026-10-27: a pick opens the item's Quick Look, so under a route
  // modal opener it opens there, in the place the page's details modal stands in, and the
  // modal shows its head at once while its page loads.
  it('opens a pick through the route modal opener, under its heading and in its place', async () => {
    offer([match(1), match(2)]);
    const open = vi.fn();
    renderWithClient(
      <RouteModalContext.Provider value={{ loading: undefined, open, cancel: () => undefined }}>
        <IngredientSearch
          search={
            <IngredientSearchForm
              label="Filter Ingredients"
              action={PATH as never}
              query=""
              shown={[]}
              searchHref={searchHref}
              pickHref={pickHref}
              pickHeading={(picked) => ({ title: picked.name })}
              pickPlace="details"
            />
          }
          previousHref={undefined}
          nextHref={undefined}
        >
          <p>Results go here</p>
        </IngredientSearch>
      </RouteModalContext.Provider>,
    );

    typeName('wort');
    await settle();
    fireEvent.click(await screen.findByRole('option', { name: /Testwort 2/ }));

    expect(open.mock.calls).toEqual([[pickHref(match(2)), { title: 'Testwort 2' }, 'details']]);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('empties the box with its clear and applies the empty search', async () => {
    offer([match(1)]);
    renderSearch('wort');

    fireEvent.click(screen.getByRole('button', { name: 'Clear Name' }));

    expect(box()).toHaveValue('');
    expect(box()).toHaveFocus();
    expect(router.push.mock.calls).toEqual([[searchHref('')]]);
  });

  it('applies the text on Enter in a closed box, trimmed, and not while typing', async () => {
    offer([match(1)]);
    renderSearch();

    typeName(' wort ');
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.submit(form());

    expect(router.push.mock.calls).toEqual([[searchHref('wort')]]);
  });

  it('applies the text on Enter while the dropdown is open and no row is highlighted', async () => {
    offer([match(1)]);
    renderSearch();

    typeName(' wort ');
    await settle();
    await screen.findByRole('option', { name: /Testwort 1/ });
    fireEvent.keyDown(box(), { key: 'Enter' });

    expect(router.push.mock.calls).toEqual([[searchHref('wort')]]);
  });

  it('shows the text typed to a field in the filter slot', () => {
    offer([]);
    renderSearch('wort');
    expect(screen.getByLabelText('Typed')).toHaveTextContent('wort');

    typeIn(box(), 'wortle');

    expect(screen.getByLabelText('Typed')).toHaveTextContent('wortle');
  });

  describe('inside a coven', () => {
    const WORKSPACE = 'workspace-w';

    /** Answers the coven's lookup with `nodes`, recording the compendium lookup if it is ever sent. */
    function offerCupboard(
      nodes: (IngredientSearchMatch & { label?: string | null })[],
      hasNextPage = false,
    ) {
      asked = [];
      const cupboardAsked: Record<string, unknown>[] = [];
      mockGraphQLQuery('IngredientSearchMatches', (variables) => {
        asked.push(variables);
        return { compendium: { pageInfo: { hasNextPage: false }, edges: [] } };
      });
      mockGraphQLQuery('IngredientSearchCupboardMatches', (variables) => {
        cupboardAsked.push(variables);
        return {
          workspaceIngredients: {
            pageInfo: { hasNextPage },
            edges: nodes.map(({ label, ...node }) => ({
              node: { ...node, cupboardEntry: label === undefined ? null : { label } },
            })),
          },
        };
      });
      return cupboardAsked;
    }

    it("asks the coven's ingredients with its id, and never the compendium", async () => {
      const cupboardAsked = offerCupboard([match(1)]);
      renderSearch('', { kind: 'cupboard', workspaceId: WORKSPACE });

      typeName('wort');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });
      await waitFor(() => expect(cupboardAsked.length).toBeGreaterThan(0));

      expect(cupboardAsked[cupboardAsked.length - 1]).toMatchObject({
        workspaceId: WORKSPACE,
        query: 'wort',
      });
      expect(asked).toHaveLength(0);
      expect(await screen.findByRole('option', { name: /Testwort 1/ })).toBeInTheDocument();
    });

    it("names a row by the coven's label where the cupboard sets one", async () => {
      const cupboardAsked = offerCupboard([{ ...match(2), label: 'Granny Wort' }, match(3)]);
      renderSearch('', { kind: 'cupboard', workspaceId: WORKSPACE });

      typeName('wort');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });
      await waitFor(() => expect(cupboardAsked.length).toBeGreaterThan(0));

      expect(await screen.findByRole('option', { name: 'Granny Wort' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Testwort 2' })).not.toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Testwort 3' })).toBeInTheDocument();
    });

    it('asks the compendium, and not the coven, when no coven is given', async () => {
      const cupboardAsked = offerCupboard([]);
      offer([match(1)]);
      renderSearch();

      typeName('wort');
      await settle();

      expect(asked.length).toBeGreaterThan(0);
      expect(cupboardAsked).toHaveLength(0);
    });
  });
  describe('in a grimoire', () => {
    const WORKSPACE = 'workspace-w';
    const GRIMOIRE: SearchSource = { kind: 'grimoire', workspaceId: WORKSPACE, status: 'complete' };

    /** Answers the grimoire lookup with `titles`, recording the compendium lookup if it is ever sent. */
    function offerSpells(titles: (string | null)[]) {
      asked = [];
      const spellsAsked: Record<string, unknown>[] = [];
      mockGraphQLQuery('IngredientSearchMatches', (variables) => {
        asked.push(variables);
        return { compendium: { pageInfo: { hasNextPage: false }, edges: [] } };
      });
      mockGraphQLQuery('GrimoireSearchMatches', (variables) => {
        spellsAsked.push(variables);
        return {
          grimoire: {
            pageInfo: { hasNextPage: false },
            edges: titles.map((title, n) => ({ node: { id: `spell-${n}`, title } })),
          },
        };
      });
      return spellsAsked;
    }

    const titleBox = () => screen.getByRole('combobox', { name: 'Title' });

    async function typeTitle(text: string, spellsAsked: Record<string, unknown>[]) {
      act(() => titleBox().focus());
      typeIn(titleBox(), text);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });
      await waitFor(() => expect(spellsAsked.length).toBeGreaterThan(0));
    }

    it("asks the coven's grimoire of the tab's status, and never the compendium", async () => {
      const spellsAsked = offerSpells(['Hearth Ward', null]);
      renderSearch('', GRIMOIRE);

      await typeTitle('hearth', spellsAsked);

      expect(spellsAsked[spellsAsked.length - 1]).toMatchObject({
        workspaceId: WORKSPACE,
        query: 'hearth',
        status: 'complete',
      });
      expect(asked).toHaveLength(0);
      expect(await screen.findByRole('option', { name: 'Hearth Ward' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Untitled Spell' })).toBeInTheDocument();
    });

    it("opens a picked spell's recipe page, by the spell's id", async () => {
      const spellsAsked = offerSpells(['Hearth Ward', null]);
      renderSearch('', GRIMOIRE);

      await typeTitle('hearth', spellsAsked);
      fireEvent.click(await screen.findByRole('option', { name: 'Hearth Ward' }));

      expect(router.push.mock.calls).toEqual([[`${PATH}?edit=spell-0`]]);
    });

    it('applies the typed text as the search where no page opener is given', async () => {
      const spellsAsked = offerSpells(['Hearth Ward']);
      renderSearch('', GRIMOIRE, null);

      await typeTitle('hearth', spellsAsked);
      fireEvent.click(await screen.findByRole('option', { name: 'Hearth Ward' }));

      expect(router.push.mock.calls).toEqual([[searchHref('Hearth Ward')]]);
    });

    it('clears by its own label and applies the empty search', () => {
      offerSpells([]);
      renderSearch('hearth', GRIMOIRE);

      fireEvent.click(screen.getByRole('button', { name: 'Clear Title' }));

      expect(titleBox()).toHaveValue('');
      expect(router.push.mock.calls).toEqual([[searchHref('')]]);
    });
  });
});
