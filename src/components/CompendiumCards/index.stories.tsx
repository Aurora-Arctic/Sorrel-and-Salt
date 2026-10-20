import type { Story } from '@ladle/react';
import type { Route } from 'next';
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
export const CanAdd: Story = () => (
  <CompendiumCards {...BASE} action="add" workspaceId={WORKSPACE_ID} />
);

// The coven already holds the first two: a check link in the plus's place, the last still a plus.
export const Held: Story = () => (
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
export const InSeveralCovens: Story = () => (
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

// A curator who can add too: the plus, then Edit, side by side at the right of the foot.
export const CanAddAndEdit: Story = () => (
  <CompendiumCards
    {...BASE}
    action="add"
    workspaceId={WORKSPACE_ID}
    entries={ENTRIES.map((entry) => ({
      ...entry,
      editHref: `/compendium?edit=${entry.slug}` as Route,
      editHeading: { eyebrow: 'Edit Compendium Entry', title: entry.name },
    }))}
  />
);

// An account that only views, or a visitor with no account (who signs in through the header):
// nothing beneath the card.
/** A curator's cards, each with Edit, which opens the compendium's edit dialog (M8.17). */
export const CuratorCanEdit: Story = () => (
  <CompendiumCards
    {...BASE}
    entries={ENTRIES.map((entry) => ({
      ...entry,
      editHref: `/compendium?edit=${entry.slug}` as Route,
      editHeading: { eyebrow: 'Edit Compendium Entry', title: entry.name },
    }))}
  />
);

export const ViewerOnly: Story = () => <CompendiumCards {...BASE} />;

// A page with a neighbour on each side.
export const MidList: Story = () => (
  <CompendiumCards
    {...BASE}
    action="add"
    workspaceId={WORKSPACE_ID}
    position={{ page: 2, pages: 3 }}
    previousHref="/compendium"
    nextHref="/compendium?after=x"
  />
);

export const Empty: Story = () => <CompendiumCards {...BASE} entries={[]} total={0} />;
