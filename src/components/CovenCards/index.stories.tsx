import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import type { Route } from 'next';
import CovenCards from '.';
import type { CovenCardEntry, CovenCardsProps } from './types';
import type { CompendiumFacetCounts } from '../CompendiumList/types';
import {
  NO_FACETS as COMPENDIUM_NO_FACETS,
  NO_FILTER as COMPENDIUM_NO_FILTER,
} from '../../../.storybook/compendium-fixtures';
import { route } from '../../../.storybook/route';

// Render-only; what shows and when is asserted in tests/components/CovenCards. The filter
// navigates to /coven/<slug>/ingredients, which the workshop does not serve.
const meta = {
  title: 'Ingredients / Coven Cards',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const NO_FILTER: CovenCardsProps['filter'] = {
  ...COMPENDIUM_NO_FILTER,
  source: '',
  inStock: false,
  lowStockOnly: false,
};

const NO_FACETS: CompendiumFacetCounts = {
  ...COMPENDIUM_NO_FACETS,
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
  retired: false,
  jars: [],
  details: {
    href: `/coven/fixture-coven/ingredients?entry=${id}` as Route,
    heading: { eyebrow: 'Ingredient', title: label },
  },
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
  entry('named-1', 'House Salt'),
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
  canAdd: true,
};

const defaultNode = <CovenCards {...BASE} />;

// A viewer: the same jar lines, and no way to add.
const forAViewerNode = <CovenCards {...BASE} canAdd={false} />;

// A page with a neighbour on each side.
const middlePageNode = (
  <CovenCards
    {...BASE}
    position={{ page: 2, pages: 3 }}
    previousHref={route('/coven/fixture-coven/ingredients')}
    nextHref={route('/coven/fixture-coven/ingredients?after=x')}
  />
);

// An empty cupboard: a member is offered the first add, a viewer reads the sentence alone.
const emptyNode = <CovenCards {...BASE} entries={[]} total={0} />;

const emptyForAViewerNode = <CovenCards {...BASE} entries={[]} total={0} canAdd={false} />;

// A search that matched nothing: the region says only what to do, pointing at the filter row's
// clears (the search sentence above already names the search), and hands the search to the Compendium.
const noMatchesNode = (
  <CovenCards {...BASE} entries={[]} total={0} filter={{ ...NO_FILTER, query: 'Knitbone' }} />
);

// A role that may delete and nothing more: the coven's own entry's only choice is its bin.
export const WithLoneBin: Story = {
  render: () => (
    <CovenCards
      {...BASE}
      entries={ENTRIES.map((shown) =>
        shown.kind === 'own' ? { ...shown, mayDelete: true } : shown,
      )}
    />
  ),
};

// A member's full foot (M8.17, M9.9): Edit or Annotate, the Edit Stock pencil, then More,
// with Delete on the coven's own entry and Make It Ours and Remove on a compendium entry.
// The jar lines stay, a badge per jar; the forms line is gone from every coven card.
const STOCK: Record<string, CovenCardEntry['stock']> = {
  'own-1': {
    forms: [
      { variantId: 'v1', label: 'Dried Leaf' },
      { variantId: 'v2', label: 'Oil' },
    ],
    jars: [
      { id: 'j1', variantId: 'v1', quantity: 3, unit: 'oz', threshold: 1 },
      { id: 'j2', variantId: 'v2', quantity: 0.5, unit: 'oz', threshold: 1 },
    ],
  },
};

export const WithStock: Story = {
  render: () => (
    <CovenCards
      {...BASE}
      entries={ENTRIES.map((shown) =>
        shown.kind === 'own'
          ? {
              ...shown,
              editHref: route(`/coven/fixture-coven/ingredients?edit=${shown.id}`),
              editHeading: { eyebrow: 'Edit Ingredient', title: shown.label },
              mayDelete: true,
              stock: STOCK[shown.id],
            }
          : {
              ...shown,
              annotateHref: route(`/coven/fixture-coven/ingredients?annotate=${shown.id}`),
              mayMakeOurs: true,
              mayRemove: true,
              stock: { forms: [{ variantId: `${shown.id}-v`, label: 'Coarse' }], jars: [] },
            },
      )}
    />
  ),
};

// One story with a control to choose the state: each is a whole page or list,
// too big to sit beside the others (claude-docs/workshop.md, rule 5).
const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'For AViewer': forAViewerNode,
  'Middle Page': middlePageNode,
  Empty: emptyNode,
  'Empty For AViewer': emptyForAViewerNode,
  'No Matches': noMatchesNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
