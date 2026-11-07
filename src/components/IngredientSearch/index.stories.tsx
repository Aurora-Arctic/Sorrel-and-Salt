import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Route } from 'next';
import { useEffect, type ReactElement } from 'react';
import {
  IngredientSearchCupboardMatchesDocument,
  IngredientSearchMatchesDocument,
  type Nomenclature,
} from '@/gql/graphql';
import { answerQuery, useMockHandlers } from '../../../.storybook/mock-api';
import IngredientSearch, { IngredientSearchForm } from '.';
import type { IngredientSearchMatch } from './types';

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

const lookup: { rows: IngredientSearchMatch[]; hasNextPage: boolean } = {
  rows: [],
  hasNextPage: false,
};

const LOOKUPS = [
  answerQuery(IngredientSearchMatchesDocument, () => ({
    compendium: {
      pageInfo: { hasNextPage: lookup.hasNextPage },
      edges: lookup.rows.map((node) => ({
        node: { ...node, nomenclature: node.nomenclature as Nomenclature },
      })),
    },
  })),
  answerQuery(IngredientSearchCupboardMatchesDocument, () => ({
    workspaceIngredients: {
      pageInfo: { hasNextPage: lookup.hasNextPage },
      edges: lookup.rows.map((node) => ({
        node: { ...node, nomenclature: node.nomenclature as Nomenclature, cupboardEntry: null },
      })),
    },
  })),
];

function useCannedMatches(rows: IngredientSearchMatch[], hasNextPage: boolean): void {
  useEffect(() => {
    lookup.rows = rows;
    lookup.hasNextPage = hasNextPage;
  }, [rows, hasNextPage]);
  useMockHandlers(LOOKUPS);
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
          source={coven ? { kind: 'cupboard', workspaceId: 'fixture-coven' } : undefined}
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
  matches: keyof typeof ROWS;
  query: 'None' | 'Testwort' | 'W';
  filterFields: boolean;
  pickHeading: boolean;
  previousPage: boolean;
}

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
