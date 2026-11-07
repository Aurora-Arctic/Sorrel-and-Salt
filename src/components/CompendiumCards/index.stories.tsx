import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import type { Route } from 'next';
import { compendiumHref } from '../CompendiumList/href';
import { detailsHeading } from '../IngredientEntry/details';
import CompendiumCards from '.';
import type { CompendiumCardEntry, CompendiumCardsProps } from './types';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { FIXTURE_COVEN } from '../../../.storybook/fixtures';
import { NO_COUNTS, NO_FILTER } from '../../../.storybook/compendium-fixtures';

const meta = {
  title: 'Ingredients / Compendium Cards',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

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
  recency: null,
  details: {
    href: compendiumHref({ entry: slug }),
    heading: detailsHeading({
      name,
      canonicalName,
      nomenclature: canonicalName ? 'botanical' : 'none',
    }),
  },
});

const withEdit = (entry: CompendiumCardEntry): CompendiumCardEntry => ({
  ...entry,
  editHref: `/compendium?edit=${entry.slug}` as Route,
  editHeading: { eyebrow: 'Edit Compendium Entry', title: entry.name },
});

const ENTRIES = [
  entry('Testwort', 'testwort-fixtura-testalis', 'Fixtura testalis', ['Dried Leaf', 'Oil']),
  entry('Testwort', 'testwort-fixtura-alteralis', 'Fixtura alteralis', ['Dried Leaf']),
  entry('Fixture Salt', 'fixture-salt', null, []),
];

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
const SECOND_ID = '00000000-0000-4000-8000-000000000002';
const COVENS = [
  { id: WORKSPACE_ID, name: 'Fixture Coven One' },
  { id: SECOND_ID, name: 'Fixture Coven Two' },
];

const BASE: CompendiumCardsProps = {
  entries: ENTRIES,
  filter: NO_FILTER,
  counts: NO_COUNTS,
  categories: [],
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
  action: 'none',
};

const canAddNode = <CompendiumCards {...BASE} action="add" workspaceId={WORKSPACE_ID} />;

const heldNode = (
  <CompendiumCards
    {...BASE}
    action="add"
    workspaceId={WORKSPACE_ID}
    entries={ENTRIES.map((entry, at) => (at < 2 ? { ...entry, held: true } : entry))}
  />
);

const inSeveralCovensNode = (
  <CompendiumCards
    {...BASE}
    action="add"
    workspaceId={WORKSPACE_ID}
    covens={COVENS}
    entries={ENTRIES.map((entry, at) => ({
      ...entry,
      held: at === ENTRIES.length - 1,
      heldIn:
        at === 0 ? [WORKSPACE_ID] : at === ENTRIES.length - 1 ? [WORKSPACE_ID, SECOND_ID] : [],
    }))}
  />
);

const canAddEditAndMoreNode = (
  <CompendiumCards
    {...BASE}
    action="add"
    workspaceId={WORKSPACE_ID}
    entries={ENTRIES.map((entry, at) => ({
      ...withEdit(entry),
      held: at === 0,
      heldIn: at === 0 ? [WORKSPACE_ID] : [],
      places:
        at === 0
          ? [
              {
                workspaceId: WORKSPACE_ID,
                covenSlug: FIXTURE_COVEN.slug,
                name: FIXTURE_COVEN.name,
                canAnnotate: true,
                canMakeOurs: true,
                canRemove: true,
                annotateHref:
                  `/compendium/ingredients/${entry.slug}?annotate=${FIXTURE_COVEN.slug}` as Route,
              },
            ]
          : undefined,
    }))}
  />
);

const curatorCanEditNode = <CompendiumCards {...BASE} entries={ENTRIES.map(withEdit)} />;

const defaultNode = <CompendiumCards {...BASE} />;

const middlePageNode = (
  <CompendiumCards
    {...BASE}
    action="add"
    workspaceId={WORKSPACE_ID}
    position={{ page: 2, pages: 3 }}
    previousHref="/compendium"
    nextHref="/compendium?after=x"
  />
);

const withMarkersNode = (
  <CompendiumCards
    {...BASE}
    entries={[{ ...ENTRIES[0], recency: 'new' }, { ...ENTRIES[1], recency: 'updated' }, ENTRIES[2]]}
  />
);

const lastPageNode = (
  <CompendiumCards {...BASE} position={{ page: 3, pages: 3 }} previousHref="/compendium?before=x" />
);

const emptyNode = <CompendiumCards {...BASE} entries={[]} total={0} />;

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Can Add': canAddNode,
  Held: heldNode,
  'In Several Covens': inSeveralCovensNode,
  'Can Add Edit And More': canAddEditAndMoreNode,
  'Curator Can Edit': curatorCanEditNode,
  'Middle Page': middlePageNode,
  'With Markers': withMarkersNode,
  'Last Page': lastPageNode,
  Empty: emptyNode,
};

const VISITOR_NODES: ReactNode[] = [defaultNode, withMarkersNode, lastPageNode, emptyNode];

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => (
    <ShellFrame
      area="none"
      open="/compendium"
      signedOut={VISITOR_NODES.includes(state as ReactNode)}
    >
      <main className="page-column">
        <header className="header">
          <p className="eyebrow">Reference</p>
          <h1>Compendium</h1>
          <p className="lede">
            Ingredients for spellwork: their formal and folk names, categories, deities and forms,
            with the sources behind them.
          </p>
        </header>
        <div>{state}</div>
      </main>
    </ShellFrame>
  ),
};
