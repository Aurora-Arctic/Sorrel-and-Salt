import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import type { Route } from 'next';
import { compendiumHref } from '../CompendiumList/href';
import { detailsHeading } from '../IngredientEntry/details';
import CompendiumCards from '.';
import type { CompendiumCardEntry, CompendiumCardsProps } from './types';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { FIXTURE_COVEN } from '../../../.storybook/fixtures';
import { NO_FACETS, NO_FILTER } from '../../../.storybook/compendium-fixtures';

// Render-only; what shows and when is asserted in tests/components/CompendiumCards. The
// filter navigates to /compendium, which the workshop does not serve.
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
  // The Quick Look eye every card carries on the site (M12.5).
  details: {
    href: compendiumHref({ entry: slug }),
    heading: detailsHeading({
      name,
      canonicalName,
      nomenclature: canonicalName ? 'botanical' : 'none',
    }),
  },
});

// An entry as a curator sees it: Edit opens the compendium's edit dialog (M8.17).
const withEdit = (entry: CompendiumCardEntry): CompendiumCardEntry => ({
  ...entry,
  editHref: `/compendium?edit=${entry.slug}` as Route,
  editHeading: { eyebrow: 'Edit Compendium Entry', title: entry.name },
});

// Two entries share a label; the formal-name line tells them apart. The last has no form.
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
  facets: NO_FACETS,
  categories: [],
  vocabulary: { deities: [], formIcons: {} },
  total: ENTRIES.length,
  action: 'none',
};

// Someone who can add to one coven: the plus at each card's bottom right adds the entry to it
// directly, until M9.12's dialog asks for a quantity. The workshop serves no /api/graphql,
// so a press shows its refusal.
const canAddNode = <CompendiumCards {...BASE} action="add" workspaceId={WORKSPACE_ID} />;

// The coven already holds the first two: a check link in the plus's place, the last still a plus.
const heldNode = (
  <CompendiumCards
    {...BASE}
    action="add"
    workspaceId={WORKSPACE_ID}
    entries={ENTRIES.map((entry, at) => (at < 2 ? { ...entry, held: true } : entry))}
  />
);

// Someone who may write in two covens: the plus is a menu of both. The first card is in the
// first coven already, so its menu shows that coven disabled; the last is in both, and shows
// the check.
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

// A curator who is also a member of a coven that holds the entries: the foot's three icons, the
// plus (a check where every coven holds it), Edit in Compendium, and the three dots, which hold
// Annotate, Make It Ours and Remove (the owner's call, 2026-10-20).
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

/** A curator's cards, each with Edit. */
const curatorCanEditNode = <CompendiumCards {...BASE} entries={ENTRIES.map(withEdit)} />;

// An account that only views, or a visitor with no account (who signs in through the header):
// nothing beneath the card.
const defaultNode = <CompendiumCards {...BASE} />;

// A page with a neighbour on each side.
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

// Two entries the marker reaches: one new this month, one changed this month.
const withMarkersNode = (
  <CompendiumCards
    {...BASE}
    entries={[{ ...ENTRIES[0], recency: 'new' }, { ...ENTRIES[1], recency: 'updated' }, ENTRIES[2]]}
  />
);

// The last page: Previous is live, Next is not.
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
  // The page around the list, as src/app/(public)/compendium/page.tsx draws it: the frame, then the
  // eyebrow, heading and lede. A state with no plus, Edit or coven foot is what a visitor with no
  // session sees, so it has the signed-out header; the rest need an account, so they have the shell.
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
        <div key={String(state)}>{state}</div>
      </main>
    </ShellFrame>
  ),
};
