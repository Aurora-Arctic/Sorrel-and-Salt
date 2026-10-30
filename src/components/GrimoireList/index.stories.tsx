import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Route } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { cardCategories, GRIMOIRE_CATEGORIES } from '../../../.storybook/grimoire-fixtures';
import { useSteps } from '../../../.storybook/press';
import { route } from '../../../.storybook/route';
import { ShellFrame } from '../../../.storybook/shell-frame';
import NewSpellAction from '../../app/(shell)/coven/[slug]/grimoire/(list)/new-spell-action';
import TabbedPage from '../TabbedPage';
import { slugify } from '../../lib/slugify';
import GrimoireList from '.';
import { GRIMOIRE_PARAMS } from './params';
import type { GrimoireFacets, GrimoireListFilter, GrimoireListProps, GrimoireSpell } from './types';

// Render-only; behaviour is asserted in tests/components/GrimoireList. The filter and the pager
// navigate to /coven/<slug>/grimoire, which the workshop does not serve. Each state is the tab as
// src/app/(shell)/coven/[slug]/grimoire/(list) draws it: the Grimoire heading with New Spell, the
// Spells and Drafts tabs, and the list.
const meta = {
  title: 'Grimoire / Grimoire List',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const COVEN = '/coven/fixture-coven/grimoire';
const SPELLS_PATH = route('/coven/fixture-coven/grimoire');
const DRAFTS_PATH = route('/coven/fixture-coven/grimoire/drafts');

/** The filter with nothing picked, as an address with no parameters reads. */
const NO_FILTER: GrimoireListFilter = GRIMOIRE_PARAMS.read({});

/** Every category, by slug, with how many spells of the tab each would leave. */
const CATEGORIES: GrimoireListProps['categories'] = GRIMOIRE_CATEGORIES.map((category, i) => ({
  ...category,
  slug: slugify(category.name),
  count: Math.max(0, 6 - i),
}));

const FACETS: GrimoireFacets = {
  moonPhases: [
    { value: 'Full Moon', label: 'Full Moon', count: 3 },
    { value: 'Waxing Gibbous', label: 'Waxing Gibbous', count: 2 },
    { value: 'New Moon', label: 'New Moon', count: 1 },
  ],
  daysOfWeek: [
    { value: 'Monday', label: 'Monday', count: 2 },
    { value: 'Friday', label: 'Friday', count: 1 },
  ],
  visibilities: [
    { value: 'private', label: 'Private', count: 1 },
    { value: 'workspace', label: 'Shared', count: 5 },
  ],
  makers: [
    { value: 'user-a', label: 'Testa Owner', count: 4 },
    { value: 'user-b', label: 'Mocka Member', count: 2 },
  ],
};

/** One spell as the tab hands it to its card, with every control an owner's role gets. */
const spell = (
  id: string,
  title: string | null,
  over: Partial<GrimoireSpell> = {},
  categories: string[] = ['Protection', 'Clarity'],
): GrimoireSpell => {
  const status = over.status ?? 'complete';
  return {
    id,
    title,
    intent: 'To keep the house and everyone under its roof safe through the winter.',
    status,
    visibility: 'workspace',
    categories: cardCategories(...categories),
    lookHref: `${COVEN}?spell=${id}` as Route,
    editHref: `${COVEN}?edit=${id}` as Route,
    lastEdit: { by: 'Testa Owner', at: '2026-10-20T10:00:00Z' },
    ...(status === 'complete' && {
      workingCount: 2,
      recordWorking: { workspaceId: 'fixture-coven', recorderId: 'user-a' },
    }),
    more: {
      workspaceId: 'fixture-coven',
      covenSlug: 'fixture-coven',
      deletedHref: SPELLS_PATH,
      canDuplicate: true,
      canDelete: true,
    },
    ...over,
  };
};

const SPELLS: GrimoireSpell[] = [
  spell('spell-hearth', 'Hearth Warding Jar'),
  spell('spell-clear', 'Clear Sight Sachet', { visibility: 'private' }, ['Clarity', 'Air']),
  spell('spell-luck', 'Fixture Luck Pouch', { intent: null }, ['Luck']),
  spell('spell-calm', 'Mockleaf Calming Oil', { workingCount: 0 }, []),
];

const DRAFTS: GrimoireSpell[] = [
  spell('draft-dream', 'Dreaming Sachet', { status: 'draft' }, ['Dreams']),
  spell('draft-untitled', null, { status: 'draft', visibility: 'private', intent: null }, []),
];

// The page around the list: the shell, then the layout's heading, New Spell and the two tabs.
const Page = ({
  drafts = false,
  children,
}: {
  drafts?: boolean;
  children: ReactNode;
}): ReactElement => (
  <ShellFrame area="coven" open={drafts ? DRAFTS_PATH : SPELLS_PATH}>
    <TabbedPage
      title="Grimoire"
      tabs={[
        { href: SPELLS_PATH, label: 'Spells', filtered: true, shape: 'cards', density: 'compact' },
        { href: DRAFTS_PATH, label: 'Drafts', filtered: true, shape: 'cards', density: 'compact' },
      ]}
      action={<NewSpellAction covenName="Fixture Coven" />}
    >
      {children}
    </TabbedPage>
  </ShellFrame>
);

/** One tab of the list: Spells unless `drafts`, every spell on one page unless a page is named. */
const Tab = ({
  drafts = false,
  spells = drafts ? DRAFTS : SPELLS,
  filter = NO_FILTER,
  total = spells.length,
  page,
}: {
  drafts?: boolean;
  spells?: readonly GrimoireSpell[];
  filter?: GrimoireListFilter;
  total?: number;
  page?: { at: number; of: number };
}): ReactElement => {
  const path = drafts ? DRAFTS_PATH : SPELLS_PATH;
  return (
    <Page drafts={drafts}>
      <GrimoireList
        path={path}
        workspaceId="fixture-coven"
        covenSlug="fixture-coven"
        status={drafts ? 'draft' : 'complete'}
        spells={spells}
        filter={filter}
        categories={CATEGORIES}
        facets={FACETS}
        total={total}
        {...(page && {
          position: { page: page.at, pages: page.of },
          ...(page.at > 1 && { previousHref: `${path}?before=cursor` as Route }),
          ...(page.at < page.of && { nextHref: `${path}?after=cursor` as Route }),
        })}
      />
    </Page>
  );
};

// Two categories matched on any, a moon phase, a day, Private and one maker: the Filters button
// counts six, and the sentence above the results says each.
const PICKED: GrimoireListFilter = {
  ...NO_FILTER,
  categories: ['protection', 'clarity'],
  categoryMode: 'any',
  moonPhases: ['Full Moon'],
  daysOfWeek: ['Monday'],
  visibility: 'private',
  makers: ['user-a'],
};

// Filters pressed once drawn, as a person would, on the wide layout (below it the sheet is modal).
const FiltersOpen = (): ReactElement => {
  useSteps([() => document.querySelector<HTMLButtonElement>('.facet-panel__button')?.click()]);
  return (
    <div style={{ minHeight: '40rem' }}>
      <Tab spells={SPELLS.slice(1, 2)} filter={PICKED} total={1} />
    </div>
  );
};

const STATES: Record<string, ReactNode> = {
  Spells: <Tab />,
  Drafts: <Tab drafts />,
  // No spell on the tab and no filter: the tab says so, and New Spell at the heading is the way in.
  'No Spells': <Tab spells={[]} />,
  'No Drafts': <Tab drafts spells={[]} />,
  // A filter that matched nothing: the hint to widen it, not the empty tab's line.
  'No Matches': <Tab spells={[]} filter={{ ...PICKED, query: 'nothing' }} total={0} />,
  // Next alone, at the right where it is on every other page.
  'First Page': <Tab page={{ at: 1, of: 3 }} total={60} />,
  'Middle Page': <Tab page={{ at: 2, of: 3 }} total={60} />,
  // Previous alone, at the left.
  'Last Page': <Tab spells={SPELLS.slice(0, 2)} page={{ at: 3, of: 3 }} total={50} />,
  'Facets and Categories Picked': <Tab spells={SPELLS.slice(1, 2)} filter={PICKED} total={1} />,
  'Filters Open With Picks': <FiltersOpen />,
};

export const States: Story = {
  args: { state: 'Spells' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
