import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import CardDensitySwitch from '.';
import type {
  CompendiumFacetCounts,
  CompendiumListFilter as Filter,
} from '../CompendiumList/types';
import CompendiumListFilter from '../CompendiumList/filter';
import IngredientCard from '../IngredientCard';
import IngredientCardList from '../IngredientCardList';
import IngredientSearch from '../IngredientSearch';
import PublicFrame from '../PublicFrame';
import { WorkshopPathname } from '../../../.ladle/navigation';

// Render-only; the attribute and the stored choice are asserted in tests/components/CardDensitySwitch.
export default {
  title: 'Ingredients / Card Density Switch',
};

// On by default. Toggling it sets `data-card-density` on the story frame's <html>
// and writes localStorage, so it persists across stories until cleared.
export const Default: Story = () => <CardDensitySwitch />;

// The switch as the coven ingredients page draws it, in the search row at a phone's width
// (MB.120, review item 6; the owner's call, 2026-10-20): the word beside its switch on the
// Filters line, level with the button, and with Clear All showing it wraps beneath, at the
// line's start. The real row (`CompendiumListFilter`, coven audience). Names are invented (M1.25).
const NO_FILTER: Filter = {
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

const NO_FACETS: CompendiumFacetCounts = {
  forms: [],
  deities: [],
  categories: [],
  zodiac: [],
  planets: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
  withoutForms: 0,
};

const NAMES = ['Testwort', 'Fixture Salt', 'Sample Root'];

const CovenSearchRow = ({ filter }: { filter: Filter }): ReactElement => (
  <WorkshopPathname.Provider value="/coven/fixture-coven/ingredients">
    <PublicFrame>
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
    </PublicFrame>
  </WorkshopPathname.Provider>
);

// No filter chosen, so no Clear All: the switch shares the Filters line.
export const CovenRowPhoneDark: Story = () => <CovenSearchRow filter={NO_FILTER} />;
CovenRowPhoneDark.meta = { theme: 'dark', width: 375 };

export const CovenRowPhoneLight: Story = () => <CovenSearchRow filter={NO_FILTER} />;
CovenRowPhoneLight.meta = { theme: 'light', width: 375 };

// A form chosen, so Clear All is drawn and the switch wraps beneath.
export const CovenRowFilteredPhoneDark: Story = () => (
  <CovenSearchRow filter={{ ...NO_FILTER, forms: ['Oil'] }} />
);
CovenRowFilteredPhoneDark.meta = { theme: 'dark', width: 375 };

export const CovenRowFilteredPhoneLight: Story = () => (
  <CovenSearchRow filter={{ ...NO_FILTER, forms: ['Oil'] }} />
);
CovenRowFilteredPhoneLight.meta = { theme: 'light', width: 375 };
