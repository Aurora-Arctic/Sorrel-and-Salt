import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FIXTURE_EDIT, GROUP_NAMES } from '../../../.storybook/fixtures';
import GroupList from '.';
import { slugify } from '../../lib/slugify';
import { groupsHref } from './href';

// Render-only; behaviour is asserted in tests/components/GroupList. Three of
// the seed's colour pairs, copied from src/db/seed/category-groups.ts, which a
// component may not import (CLAUDE.md rule 1), on invented groups. The stories
// of the bare list are the list alone; the phone stories stand for the page, which
// draws the list only inside its tabbed page (`GroupPage`, `tabbed-layout.tsx`):
// the admin layout's frame, the heading and tabs, and the tab's Add.
const meta = {
  title: 'Admin / Group List',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

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

export const Default: Story = { render: CategoryGroupsView };

export const FormGroups: Story = {
  render: () => (
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
  ),
};

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

// The traditions take a name search (MB.115), empty until one is asked.
export const Traditions: Story = {
  render: () => (
    <GroupList
      kind="tradition"
      groups={traditions(['Fixtural', 'Mockish', 'Testwort Rite'])}
      filter={{ query: '' }}
    />
  ),
};

// Searched by a fragment of the name, Clear drawn at the row's end.
const TraditionsSearchedView = () => (
  <GroupList
    kind="tradition"
    groups={traditions(['Fixtural', 'Fixture Rite'], 'fixtur')}
    filter={{ query: 'fixtur' }}
  />
);

export const TraditionsSearched: Story = { render: TraditionsSearchedView };

// A search matching nothing says what to change.
export const TraditionsNoMatches: Story = {
  render: () => <GroupList kind="tradition" groups={[]} filter={{ query: 'nothing' }} />,
};

export const Empty: Story = { render: () => <GroupList kind="form" groups={[]} /> };

// The traditions' empty message names them.
export const TraditionsEmpty: Story = {
  render: () => <GroupList kind="tradition" groups={[]} filter={{ query: '' }} />,
};
