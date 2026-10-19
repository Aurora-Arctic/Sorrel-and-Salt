import type { Story } from '@ladle/react';
import CompendiumCards from '.';
import type { CompendiumCardEntry, CompendiumCardsProps } from './types';
import type { CompendiumFacetCounts, CompendiumListFilter } from '../CompendiumList/types';

// Render-only; what shows and when is asserted in tests/components/CompendiumCards. The
// filter navigates to /compendium, which the workshop does not serve.
export default {
  title: 'Surfaces / Compendium Cards',
};

const NO_FILTER: CompendiumListFilter = {
  query: '',
  forms: [],
  withoutReferences: false,
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
};

const entry = (
  name: string,
  slug: string,
  canonicalName: string | null,
  forms: string[],
): CompendiumCardEntry => ({
  id: slug,
  name,
  slug,
  canonicalName,
  nomenclature: canonicalName ? 'botanical' : 'none',
  categories: [],
  variants: forms.map((form) => ({ form, formChoice: { group: { icon: 'botanical' } } })),
  toxic: false,
  safetyNotes: null,
});

// Two entries share a label; the formal-name line tells them apart. The last has no form.
const ENTRIES = [
  entry('Testwort', 'testwort-fixtura-testalis', 'Fixtura testalis', ['Dried Leaf', 'Oil']),
  entry('Testwort', 'testwort-fixtura-alteralis', 'Fixtura alteralis', ['Dried Leaf']),
  entry('Fixture Salt', 'fixture-salt', null, []),
];

const BASE: CompendiumCardsProps = {
  entries: ENTRIES,
  filter: NO_FILTER,
  facets: NO_FACETS,
  categories: [],
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
  action: 'none',
};

// Someone who can add: the button is disabled until M9.12 builds its dialog.
export const CanAdd: Story = () => <CompendiumCards {...BASE} action="add" />;

// An account that only views, or a visitor with no account (who signs in through the header):
// nothing beneath the card.
export const ViewerOnly: Story = () => <CompendiumCards {...BASE} />;

// A page with a neighbour on each side.
export const MidList: Story = () => (
  <CompendiumCards
    {...BASE}
    action="add"
    position={{ page: 2, pages: 3 }}
    previousHref="/compendium"
    nextHref="/compendium?after=x"
  />
);

export const Empty: Story = () => <CompendiumCards {...BASE} entries={[]} total={0} />;
