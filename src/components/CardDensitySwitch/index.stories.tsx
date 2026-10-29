import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import CardDensitySwitch from '.';
import type { CompendiumListFilter as Filter } from '../CompendiumList/types';
import CompendiumListFilter from '../CompendiumList/filter';
import IngredientCard from '../IngredientCard';
import IngredientCardList from '../IngredientCardList';
import IngredientSearch from '../IngredientSearch';
import PublicFrame from '../PublicFrame';
import { NO_FACETS, NO_FILTER } from '../../../.storybook/compendium-fixtures';
import { WorkshopPathname } from '../../../.storybook/navigation';

// Render-only; the attribute and the stored choice are asserted in tests/components/CardDensitySwitch.
const meta = {
  title: 'Ingredients / Card Density Switch',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// The switch as the coven ingredients page draws it, in the search row when narrow
// (MB.120, review item 6; the owner's call, 2026-10-20): the word beside its switch on the
// Filters line, level with the button, and with Clear All showing it wraps beneath, at the
// line's start. The real row (`CompendiumListFilter`, coven audience). Names are invented (M1.25).
const NAMES = ['Testwort', 'Fixture Salt', 'Sample Root'];

const CovenSearchRow = ({ filter }: { filter: Filter }): ReactElement => (
  <WorkshopPathname.Provider value="/coven/fixture-coven/ingredients">
    <PublicFrame>
      <main>
        <div className="page-column">
          <IngredientSearch
            shape="cards"
            search={
              <CompendiumListFilter
                audience="coven"
                covenSlug="fixture-coven"
                workspaceId="00000000-0000-4000-8000-000000000001"
                filter={filter}
                facets={NO_FACETS}
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

// No filter chosen, so no Clear All: the switch shares the Filters line.
const covenRowNode = <CovenSearchRow filter={NO_FILTER} />;
// A form chosen, so Clear All is drawn and the switch wraps beneath.
const covenRowFilteredNode = <CovenSearchRow filter={{ ...NO_FILTER, forms: ['Oil'] }} />;

// Switch: on by default. Toggling it sets `data-card-density` on the story frame's <html>
// and writes localStorage, so it persists across stories until cleared.
const STATES: Record<string, ReactNode> = {
  Switch: <CardDensitySwitch />,
  'Coven Row': covenRowNode,
  'Coven Row Filtered': covenRowFilteredNode,
};

export const States: Story = {
  args: { state: 'Switch' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
