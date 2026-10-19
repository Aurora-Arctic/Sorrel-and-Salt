import type { Story } from '@ladle/react';
import CovenCards from '.';
import type { CovenCardEntry, CovenCardsProps } from './types';
import type { CompendiumFacetCounts } from '../CompendiumList/types';

// Render-only; what shows and when is asserted in tests/components/CovenCards. The filter
// navigates to /coven/<slug>/ingredients, which the workshop does not serve.
export default {
  title: 'Surfaces / Coven Cards',
};

const NO_FILTER: CovenCardsProps['filter'] = {
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
  source: '',
  inStock: false,
  lowStockOnly: false,
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
  source: [
    { value: 'local', label: 'Local', count: 2 },
    { value: 'compendium', label: 'Compendium', count: 1 },
  ],
  inStock: 2,
  lowStockOnly: 1,
};

const entry = (id: string, label: string, over: Partial<CovenCardEntry> = {}): CovenCardEntry => ({
  id,
  label,
  canonicalName: null,
  nomenclature: 'none',
  categories: [],
  variants: [],
  toxic: false,
  safetyNotes: null,
  kind: 'cupboard',
  annotated: false,
  retired: false,
  jars: [],
  ...over,
});

// One of the coven's own, with two jars (one low); a compendium entry it names, relabelled; and
// one with no jar, which is information only.
const ENTRIES = [
  entry('own-1', 'Testwort', {
    kind: 'own',
    canonicalName: 'Fixtura testalis',
    nomenclature: 'botanical',
    variants: [
      { form: 'Dried Leaf', formChoice: { group: { icon: 'botanical' } } },
      { form: 'Oil', formChoice: { group: { icon: 'botanical' } } },
    ],
    jars: [
      { id: 'j1', form: 'Dried Leaf', icon: 'botanical', quantity: 3, unit: 'oz', threshold: 1 },
      { id: 'j2', form: 'Oil', icon: 'botanical', quantity: 0.5, unit: 'oz', threshold: 1 },
    ],
  }),
  entry('named-1', 'House Salt', { annotated: true }),
  entry('named-2', 'Fixture Salt'),
];

const BASE: CovenCardsProps = {
  covenSlug: 'fixture-coven',
  workspaceId: 'workshop',
  entries: ENTRIES,
  filter: NO_FILTER,
  facets: NO_FACETS,
  categories: [],
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
};

export const Default: Story = () => <CovenCards {...BASE} />;

// A page with a neighbour on each side.
export const MidList: Story = () => (
  <CovenCards
    {...BASE}
    position={{ page: 2, pages: 3 }}
    previousHref="/coven/fixture-coven/ingredients"
    nextHref="/coven/fixture-coven/ingredients?after=x"
  />
);

export const Empty: Story = () => <CovenCards {...BASE} entries={[]} total={0} />;

// A member's view: Edit in the foot of the coven's own entry, none on the compendium's (M8.17).
export const WithEdit: Story = () => (
  <CovenCards
    {...BASE}
    entries={ENTRIES.map((shown) =>
      shown.kind === 'own'
        ? {
            ...shown,
            editHref: `/coven/fixture-coven/ingredients?edit=${shown.id}`,
            editHeading: { eyebrow: 'Edit Ingredient', title: shown.label },
          }
        : shown,
    )}
  />
);

// A member's view of compendium entries the cupboard holds: Annotate, with its own icon, in
// each one's foot, and Edit on the coven's own (M8.17).
export const WithAnnotate: Story = () => (
  <CovenCards
    {...BASE}
    entries={ENTRIES.map((shown) =>
      shown.kind === 'own'
        ? {
            ...shown,
            editHref: `/coven/fixture-coven/ingredients?edit=${shown.id}`,
            editHeading: { eyebrow: 'Edit Ingredient', title: shown.label },
          }
        : { ...shown, annotateHref: `/coven/fixture-coven/ingredients?annotate=${shown.id}` },
    )}
  />
);
