import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import type { Route } from 'next';
import CovenCards from '.';
import type { CovenCardEntry, CovenCardsProps } from './types';
import type { WorkspaceIngredientFacets } from '@/modules/ingredients';
import { NO_FILTER as COMPENDIUM_NO_FILTER } from '../../../.storybook/compendium-fixtures';
import PageHeader from '../PageHeader';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { route } from '../../../.storybook/route';

const meta = {
  title: 'Ingredients / Coven Cards',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const NO_FILTER: CovenCardsProps['filter'] = {
  ...COMPENDIUM_NO_FILTER,
  source: '',
  inStock: false,
  lowStockOnly: false,
};

const NO_COUNTS: WorkspaceIngredientFacets = {
  forms: [],
  deities: [],
  categories: [],
  zodiacSigns: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  source: [
    { value: 'local', count: 2 },
    { value: 'compendium', count: 1 },
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

const ENTRIES = [
  entry('own-1', 'Testwort', {
    kind: 'own',
    canonicalName: 'Fixtura testalis',
    nomenclature: 'botanical',
    safetyNotes: 'Dilute before use.',
    lastEdit: { by: 'Fixture A', at: new Date().toISOString() },
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
  counts: NO_COUNTS,
  categories: [],
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
  canAdd: true,
};

const forAViewerNode = <CovenCards {...BASE} canAdd={false} />;

const middlePageNode = (
  <CovenCards
    {...BASE}
    position={{ page: 2, pages: 3 }}
    previousHref={route('/coven/fixture-coven/ingredients')}
    nextHref={route('/coven/fixture-coven/ingredients?after=x')}
  />
);

const emptyNode = <CovenCards {...BASE} entries={[]} total={0} />;

const emptyForAViewerNode = <CovenCards {...BASE} entries={[]} total={0} canAdd={false} />;

const noMatchesNode = (
  <CovenCards {...BASE} entries={[]} total={0} filter={{ ...NO_FILTER, query: 'Knitbone' }} />
);

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

const withStockNode = (
  <CovenCards
    {...BASE}
    entries={ENTRIES.map((shown) =>
      shown.kind === 'own'
        ? {
            ...shown,
            editHref: route(`/coven/fixture-coven/ingredients?edit=${shown.id}`),
            editHeading: { eyebrow: 'Edit Ingredient', title: shown.label },
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
);

const defaultNode = withStockNode;

export const WithStock: Story = { render: () => withStockNode };

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'For A Viewer': forAViewerNode,
  'Middle Page': middlePageNode,
  Empty: emptyNode,
  'Empty For A Viewer': emptyForAViewerNode,
  'No Matches': noMatchesNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => (
    <ShellFrame area="coven" open="/coven/fixture-coven/ingredients">
      <main>
        <PageHeader title="Ingredients" />
        <div>{state}</div>
      </main>
    </ShellFrame>
  ),
};
