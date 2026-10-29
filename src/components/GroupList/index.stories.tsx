import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { AdminTabbedFrame } from '../../../.storybook/admin-frame';
import { FIXTURE_EDIT, GROUP_NAMES } from '../../../.storybook/fixtures';
import GroupList from '.';
import { slugify } from '../../lib/slugify';
import { groupsHref } from './href';

// Render-only; behaviour is asserted in tests/components/GroupList. Three seed
// colour pairs copied from src/db/seed/category-groups.ts (a component may not
// import it, CLAUDE.md rule 1). The phone stories stand for the `GroupPage` page.
const meta = {
  title: 'Admin / Group List',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const CATEGORY_GROUPS = [
  { name: 'Fixture Mending', colorDark: '#559c54', colorLight: '#326d31' },
  { name: 'Testcraft', colorDark: '#c371c6', colorLight: '#a13ba5' },
  { name: 'Testward', colorDark: '#5d8ab1', colorLight: '#286ba6' },
].map((group) => ({ ...group, description: 'An invented group, for the workshop.' }));

const CategoryGroupsView = () => (
  <GroupList
    kind="category"
    groups={CATEGORY_GROUPS.map((group) => {
      const slug = slugify(group.name);
      return {
        ...group,
        id: slug,
        slug,
        ...FIXTURE_EDIT,
        editHref: groupsHref('category', {}, { edit: slug }),
        editHeading: { eyebrow: 'Edit Category Group', title: group.name },
      };
    })}
  />
);

// The Groups tab as the route draws it (`/admin/category-groups`): the app shell, the admin row,
// the Categories heading with its Categories and Groups toggle, and the tab's Add.
const defaultNode = (
  <AdminTabbedFrame
    shell
    page="categories"
    open="/admin/category-groups"
    action={
      <Link className="btn btn--solid" href={'/admin/category-groups?new' as Route}>
        Add Category Group
      </Link>
    }
  >
    <CategoryGroupsView />
  </AdminTabbedFrame>
);

const formGroupsNode = (
  <GroupList
    kind="form"
    groups={GROUP_NAMES.form.slice(0, 2).map((name) => {
      const slug = slugify(name);
      return {
        id: slug,
        name,
        slug,
        description: 'An invented group, for the workshop.',
        // The first has an icon; the second shows the generic.
        icon: name === GROUP_NAMES.form[0] ? ('mineral' as const) : null,
        ...FIXTURE_EDIT,
        editHref: groupsHref('form', {}, { edit: slug }),
        editHeading: { eyebrow: 'Edit Form Group', title: name },
      };
    })}
    nextHref={groupsHref('form', { after: 'cursor' })}
    position={{ page: 1, pages: 2 }}
  />
);

/** Invented traditions as the page lists them, each Edit keeping the search. */
const traditions = (names: readonly string[], query = '') =>
  names.map((name) => {
    const slug = slugify(name);
    return {
      id: slug,
      name,
      slug,
      description: 'An invented tradition, for the workshop.',
      ...FIXTURE_EDIT,
      editHref: groupsHref('tradition', { query }, { edit: slug }),
      editHeading: { eyebrow: 'Edit Tradition', title: name },
    };
  });

// The traditions take a name search, empty until one is asked.
const traditionsNode = (
  <GroupList
    kind="tradition"
    groups={traditions(['Fixtural', 'Mockish', 'Testwort Rite'])}
    filter={{ query: '' }}
  />
);

// Searched by a fragment of the name, Clear drawn at the row's end.
const TraditionsSearchedView = () => (
  <GroupList
    kind="tradition"
    groups={traditions(['Fixtural', 'Fixture Rite'], 'fixtur')}
    filter={{ query: 'fixtur' }}
  />
);

const traditionsSearchedNode = <TraditionsSearchedView />;

// A search matching nothing says what to change.
const traditionsNoMatchesNode = (
  <GroupList kind="tradition" groups={[]} filter={{ query: 'nothing' }} />
);

const emptyNode = <GroupList kind="form" groups={[]} />;

// The traditions' empty message names them.
const traditionsEmptyNode = <GroupList kind="tradition" groups={[]} filter={{ query: '' }} />;

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Form Groups': formGroupsNode,
  Traditions: traditionsNode,
  'Traditions Searched': traditionsSearchedNode,
  'Traditions No Matches': traditionsNoMatchesNode,
  Empty: emptyNode,
  'Traditions Empty': traditionsEmptyNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
