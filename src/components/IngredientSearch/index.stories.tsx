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
type Story = StoryObj<typeof meta>;

const PATH: Route = '/compendium';

const matches = (count: number): IngredientSearchMatch[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `fixture-${index + 1}`,
    slug: `testwort-${index + 1}`,
    name: index === 0 ? 'Testwort' : `Testwort ${index + 1}`,
    canonicalName: index % 2 === 0 ? 'Fixtura testalis' : null,
    nomenclature: index % 2 === 0 ? 'botanical' : 'none',
  }));

/** Answers the dropdown's lookup with `rows`; the original `fetch` is put back on unmount. */
function useCannedMatches(rows: IngredientSearchMatch[], hasNextPage: boolean): void {
  useLayoutEffect(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.pathname === '/api/graphql' && typeof init?.body === 'string') {
        const { operationName } = JSON.parse(init.body) as { operationName?: string };
        if (operationName === 'IngredientSearchMatches') {
          const data = {
            compendium: {
              pageInfo: { hasNextPage },
              edges: rows.map((node) => ({ node })),
            },
          };
          return new Response(JSON.stringify({ data }), {
            headers: { 'content-type': 'application/json' },
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

const Shell = ({
  rows,
  hasNextPage,
}: {
  rows: IngredientSearchMatch[];
  hasNextPage: boolean;
}): ReactElement => {
  useCannedMatches(rows, hasNextPage);
  return (
    <IngredientSearch
      search={
        <IngredientSearchForm
          label="Filter the Compendium"
          action={PATH}
          query=""
          shown={[]}
          searchHref={(text) =>
            (text ? `${PATH}?query=${encodeURIComponent(text)}` : PATH) as Route
          }
          pickHref={(match) => `${PATH}/ingredients/${match.slug}` as Route}
        />
      }
      action={<button type="button">Add Ingredient</button>}
      nextHref={`${PATH}?after=x` as Route}
      position={{ page: 1, pages: 2 }}
    >
      <ul>
        {matches(3).map((match) => (
          <li key={match.id}>{match.name}</li>
        ))}
      </ul>
    </IngredientSearch>
  );
};

/** Type "wort": a few matches, no action row. */
export const Default: Story = { render: () => <Shell rows={matches(4)} hasNextPage={false} /> };

/** Type "wort": a full dropdown ending in the See all results. row. */
export const ManyMatches: Story = { render: () => <Shell rows={matches(25)} hasNextPage /> };

/** Type "wort": nothing matches, so the dropdown says so. */
export const NoMatches: Story = { render: () => <Shell rows={[]} hasNextPage={false} /> };
