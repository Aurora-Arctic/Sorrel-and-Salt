import { ListBodySkeleton } from '../ListFrame/skeleton';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import CardDensitySwitch from '.';
import type { CompendiumListFilter as Filter } from '../CompendiumList/types';
import CompendiumListFilter from '../CompendiumList/filter';
import IngredientCard from '../IngredientCard';
import IngredientCardList from '../IngredientCardList';
import IngredientSearch from '../IngredientSearch';
import PublicFrame from '../PublicFrame';
import { NO_COUNTS, NO_FILTER } from '../../../.storybook/compendium-fixtures';
import { WorkshopPathname } from '../../../.storybook/navigation';

const meta = {
  title: 'Forms / Card Density Switch',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const NAMES = ['Testwort', 'Fixture Salt', 'Sample Root'];

const CovenSearchRow = ({ filter }: { filter: Filter }): ReactElement => (
  <WorkshopPathname.Provider value="/coven/fixture-coven/ingredients">
    <PublicFrame>
      <main>
        <div className="page-column">
          <IngredientSearch
            skeleton={<ListBodySkeleton label="Ingredients" />}
            search={
              <CompendiumListFilter
                audience="coven"
                covenSlug="fixture-coven"
                workspaceId="00000000-0000-4000-8000-000000000001"
                filter={filter}
                counts={NO_COUNTS}
                categories={[]}
                vocabulary={{ deities: [], formIcons: {} }}
                total={NAMES.length}
              />
            }
          >
            <IngredientCardList label="Ingredients">
              {NAMES.map((name) => (
                <IngredientCard
                  key={name}
                  href="/compendium"
                  label={name}
                  formalName={null}
                  nomenclature="none"
                  categories={[]}
                  variants={[]}
                  toxic={false}
                  safetyNotes={null}
                  kind="compendium"
                />
              ))}
            </IngredientCardList>
          </IngredientSearch>
        </div>
      </main>
    </PublicFrame>
  </WorkshopPathname.Provider>
);

const covenRowNode = <CovenSearchRow filter={NO_FILTER} />;
const covenRowFilteredNode = <CovenSearchRow filter={{ ...NO_FILTER, forms: ['Oil'] }} />;

const STATES: Record<string, ReactNode> = {
  Switch: <CardDensitySwitch />,
  'Coven Row': covenRowNode,
  'Coven Row Filtered': covenRowFilteredNode,
};

export const States: Story = {
  args: { state: 'Switch' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
