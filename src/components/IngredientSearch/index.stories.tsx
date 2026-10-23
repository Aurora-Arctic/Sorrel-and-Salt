import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Route } from 'next';
import { type ReactElement, useLayoutEffect } from 'react';
import IngredientSearch, { IngredientSearchForm } from '.';
import type { IngredientSearchMatch } from './types';

// Render-only; behaviour is asserted in tests/components/IngredientSearch. The
// dropdown asks `/api/graphql`, which the workshop does not serve, so each
// story stubs `window.fetch` for as long as it is mounted. Names are invented.
const meta = {
  title: 'Ingredients / Ingredient Search',
} satisfies Meta;
export default meta;

const PATH: Route = '/compendium';

const matches = (count: number): IngredientSearchMatch[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `fixture-${index + 1}`,
    slug: `testwort-${index + 1}`,
    name: index === 0 ? 'Testwort' : `Testwort ${index + 1}`,
    canonicalName: index % 2 === 0 ? 'Fixtura testalis' : null,
    nomenclature: index % 2 === 0 ? 'botanical' : 'none',
  }));

/**
 * Answers the dropdown's lookups with `rows`, the compendium's and a coven's
 * alike; the original `fetch` is put back on unmount.
 */
function useCannedMatches(rows: IngredientSearchMatch[], hasNextPage: boolean): void {
  useLayoutEffect(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.pathname === '/api/graphql' && typeof init?.body === 'string') {
        const { operationName } = JSON.parse(init.body) as { operationName?: string };
        const answer = (data: unknown): Response =>
          new Response(JSON.stringify({ data }), {
            headers: { 'content-type': 'application/json' },
          });
        if (operationName === 'IngredientSearchMatches') {
          return answer({
            compendium: { pageInfo: { hasNextPage }, edges: rows.map((node) => ({ node })) },
          });
        }
        if (operationName === 'IngredientSearchCupboardMatches') {
          return answer({
            workspaceIngredients: {
              pageInfo: { hasNextPage },
              edges: rows.map((node) => ({ node: { ...node, cupboardEntry: null } })),
            },
          });
        }
      }
      return original(input, init);
    };
    return () => {
      window.fetch = original;
    };
  }, [rows, hasNextPage]);
}

interface ShellProps {
  rows: IngredientSearchMatch[];
  hasNextPage: boolean;
  coven: boolean;
  shape: 'table' | 'cards';
  query: string;
  filterFields: boolean;
  pickHeading: boolean;
  previous: boolean;
}

const Shell = ({
  rows,
  hasNextPage,
  coven,
  shape,
  query,
  filterFields,
  pickHeading,
  previous,
}: ShellProps): ReactElement => {
  useCannedMatches(rows, hasNextPage);
  return (
    <IngredientSearch
      search={
        <IngredientSearchForm
          label={coven ? 'Filter Ingredients' : 'Filter the Compendium'}
          action={PATH}
          query={query}
          shown={query ? [query] : []}
          workspaceId={coven ? 'fixture-coven' : undefined}
          searchHref={(text) =>
            (text ? `${PATH}?query=${encodeURIComponent(text)}` : PATH) as Route
          }
          pickHref={(match) => `${PATH}/ingredients/${match.slug}` as Route}
          pickHeading={
            pickHeading ? (match) => ({ eyebrow: 'Edit Ingredient', title: match.name }) : undefined
          }
        >
          {filterFields && (
            <label>
              Category
              <input name="category" />
            </label>
          )}
        </IngredientSearchForm>
      }
      action={
        <button type="button" className="btn btn--solid">
          Add Ingredient
        </button>
      }
      previousHref={previous ? (`${PATH}` as Route) : undefined}
      nextHref={`${PATH}?after=x` as Route}
      position={{ page: previous ? 2 : 1, pages: 2 }}
      shape={shape}
    >
      <ul>
        {matches(3).map((match) => (
          <li key={match.id}>{match.name}</li>
        ))}
      </ul>
    </IngredientSearch>
  );
};

const ROWS = { Few: matches(4), Many: matches(25), None: [] as IngredientSearchMatch[] };

interface StatesArgs {
  scope: 'Compendium' | 'Coven';
  shape: 'Table' | 'Cards';
  /** Type in the box to see the dropdown; "Many" ends in See All Results. */
  matches: keyof typeof ROWS;
  /** None: empty box; Testwort: a search shown, so Clear is drawn; W: under the search floor, so the box says to keep typing. */
  query: 'None' | 'Testwort' | 'W';
  filterFields: boolean;
  pickHeading: boolean;
  previousPage: boolean;
}

// Render-only. The box starts empty: focus it and type "wort" to see the
// dropdown (a few matches, a full list ending in See All Results, or none).
export const States: StoryObj<StatesArgs> = {
  args: {
    scope: 'Compendium',
    shape: 'Table',
    matches: 'Few',
    query: 'None',
    filterFields: false,
    pickHeading: false,
    previousPage: false,
  },
  argTypes: {
    scope: { control: 'radio', options: ['Compendium', 'Coven'] },
    shape: { control: 'radio', options: ['Table', 'Cards'] },
    matches: { control: 'radio', options: Object.keys(ROWS) },
    query: { control: 'radio', options: ['None', 'Testwort', 'W'] },
  },
  render: (args) => (
    <Shell
      key={JSON.stringify(args)}
      rows={ROWS[args.matches]}
      hasNextPage={args.matches === 'Many'}
      coven={args.scope === 'Coven'}
      shape={args.shape === 'Cards' ? 'cards' : 'table'}
      query={args.query === 'None' ? '' : args.query === 'W' ? 'w' : 'Testwort'}
      filterFields={args.filterFields}
      pickHeading={args.pickHeading}
      previous={args.previousPage}
    />
  ),
};
