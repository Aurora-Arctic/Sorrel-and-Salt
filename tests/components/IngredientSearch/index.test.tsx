import { act, fireEvent, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientSearch, {
  IngredientSearchForm,
  useSearchText,
} from '@/components/IngredientSearch';
import type { IngredientSearchMatch } from '@/components/IngredientSearch/types';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { renderWithClient, waitFor } from '../../support/ingredient-form';
import { typeIn } from '../../support/interact';
import { mockGraphQLQuery } from '../../support/msw/graphql';

// The filter navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The search shell and its row (M8.10): a type-ahead over the compendium's
// ranked search, whose dropdown follows the debounced text while the list
// changes only on Enter, a pick or See All Results
// (claude-docs/components/ingredient-search.md, "Testing").

const PATH = '/compendium';
const searchHref = (text: string) => `${PATH}?query=${encodeURIComponent(text)}` as never;
const pickHref = (match: IngredientSearchMatch) => `${PATH}?edit=${match.slug}` as never;

const match = (n: number): IngredientSearchMatch => ({
  id: `id-${n}`,
  slug: `testwort-${n}`,
  name: `Testwort ${n}`,
  canonicalName: n === 1 ? 'Fixtura testalis' : null,
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

function renderSearch(query = '') {
  return renderWithClient(
    <IngredientSearch
      search={
        <IngredientSearchForm
          label="Filter Ingredients"
          action={PATH as never}
          query={query}
          shown={[query]}
          searchHref={searchHref}
          pickHref={pickHref}
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
const form = () => screen.getByRole('form', { name: 'Filter Ingredients' });
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

  it('works before hydration as a GET form to the page, the box sending its text as query', () => {
    renderSearch('wort');

    expect(form()).toHaveAttribute('method', 'get');
    expect(form()).toHaveAttribute('action', PATH);
    expect(box()).toHaveAttribute('name', 'query');
    expect(new FormData(form() as HTMLFormElement).get('query')).toBe('wort');
    expect(screen.getByRole('button', { name: 'Search' })).toHaveAttribute('type', 'submit');
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

  it('asks nothing while the text is under two characters, and offers no empty message', async () => {
    offer([match(1)]);
    renderSearch();

    typeName('w');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    });
    expect(asked).toHaveLength(0);
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.queryByText('No Matches')).not.toBeInTheDocument();
  });

  it('asks for the first 25 and never a cursor, offering the rows in the server order, at most 25', async () => {
    const many = Array.from({ length: 30 }, (_, i) => match(i + 1));
    offer(many.slice(0, 25), true);
    renderSearch();

    typeName('wort');
    await settle();

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(25));
    expect(asked.every((variables) => !('after' in variables) && !('before' in variables))).toBe(
      true,
    );
    expect(asked.every((variables) => variables.first === 25)).toBe(true);
    const names = screen.getAllByRole('option').map((option) => option.textContent);
    expect(names[0]).toContain('Testwort 1');
    expect(names[1]).toContain('Testwort 2');
    expect(names[24]).toContain('Testwort 25');
  });

  it('offers See All Results beneath the list only when there is another page, to the list under the text', async () => {
    offer([match(1), match(2)], true);
    renderSearch();

    typeName('wort');
    await settle();

    const link = await screen.findByRole('link', { name: 'See All Results' });
    expect(link).toHaveAttribute('href', searchHref('wort'));
    expect(screen.getByRole('listbox')).not.toContainElement(link);
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.click(link);
    expect(router.push).toHaveBeenCalledWith(searchHref('wort'));
  });

  it('offers no See All Results when every match is on the first page', async () => {
    offer([match(1), match(2)], false);
    renderSearch();

    typeName('wort');
    await settle();

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    expect(screen.queryByRole('link', { name: 'See All Results' })).not.toBeInTheDocument();
  });

  it('counts its rows in the status, and reads the empty message when nothing matches', async () => {
    offer([match(1), match(2)]);
    renderSearch();

    typeName('wort');
    await settle();
    await waitFor(() => expect(status()).toHaveTextContent('2'));

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

  it('empties the box with its clear and changes nothing else', async () => {
    offer([match(1)]);
    renderSearch('wort');

    fireEvent.click(screen.getByRole('button', { name: 'Clear Name' }));

    expect(box()).toHaveValue('');
    expect(box()).toHaveFocus();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('applies the text on Enter in a closed box, trimmed, and not while typing', async () => {
    offer([match(1)]);
    renderSearch();

    typeName(' wort ');
    expect(router.push).not.toHaveBeenCalled();

    fireEvent.submit(form());

    expect(router.push.mock.calls).toEqual([[searchHref('wort')]]);
  });

  it('shows the text typed to a field in the filter slot', () => {
    renderSearch('wort');
    expect(screen.getByLabelText('Typed')).toHaveTextContent('wort');

    typeIn(box(), 'wortle');

    expect(screen.getByLabelText('Typed')).toHaveTextContent('wortle');
  });
});
