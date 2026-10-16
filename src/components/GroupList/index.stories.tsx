import type { Story } from '@ladle/react';
import type { ReactElement, ReactNode } from 'react';
import { AdminTabbedFrame } from '../../../.ladle/admin-frame';
import { GROUP_NAMES } from '../../../.ladle/fixtures';
import AddAction from '../../app/(shell)/admin/add-action';
import GroupList from '.';
import { slugify } from '../../lib/slugify';
import { groupsHref } from './href';
import { KINDS } from './kinds';

// Render-only; behaviour is asserted in tests/components/GroupList. Three of
// the seed's colour pairs, copied from src/db/seed/category-groups.ts, which a
// component may not import (CLAUDE.md rule 1), on invented groups. The stories
// of the bare list are the list alone; the phone stories stand for the page, which
// draws the list only inside its tabbed page (`GroupPage`, `tabbed-layout.tsx`):
// the admin layout's frame, the heading and tabs, and the tab's Add.
export default {
  title: 'Admin / Group List',
};

const CATEGORY_GROUPS = [
  { name: 'Fixture Mending', colorDark: '#559c54', colorLight: '#326d31' },
  { name: 'Testcraft', colorDark: '#c371c6', colorLight: '#a13ba5' },
  { name: 'Testward', colorDark: '#5d8ab1', colorLight: '#286ba6' },
].map((group) => ({ ...group, description: 'An invented group, for the workshop.' }));

// The group list as its route draws it: the Categories page with the Groups
// tab open, or the Deities page with the Deity Traditions tab open.
const OnItsPage = ({
  kind,
  children,
}: {
  kind: 'category' | 'tradition';
  children: ReactNode;
}): ReactElement => {
  const { path, label, add } = KINDS[kind];
  return (
    <AdminTabbedFrame
      page={kind === 'category' ? 'categories' : 'deities'}
      open={path}
      action={
        <AddAction href={groupsHref(kind, {}, 'new')} heading={{ title: `Add ${label}` }}>
          {add}
        </AddAction>
      }
    >
      {children}
    </AdminTabbedFrame>
  );
};

export const CategoryGroups: Story = () => (
  <GroupList
    kind="category"
    groups={CATEGORY_GROUPS.map((group) => {
      const slug = slugify(group.name);
      return {
        ...group,
        id: slug,
        slug,
        updatedBy: 'Fixture Editor',
        updatedAt: new Date('2026-05-06T10:00:00Z'),
        editHref: groupsHref('category', {}, { edit: slug }),
        editHeading: { eyebrow: 'Edit Category Group', title: group.name },
      };
    })}
  />
);

// At a phone's width, on its page, in each theme: each row a card.
export const PhoneDark: Story = () => (
  <OnItsPage kind="category">
    <CategoryGroups />
  </OnItsPage>
);
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => (
  <OnItsPage kind="category">
    <CategoryGroups />
  </OnItsPage>
);
PhoneLight.meta = { theme: 'light', width: 375 };

export const FormGroups: Story = () => (
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
        updatedBy: 'Fixture Editor',
        updatedAt: new Date('2026-05-06T10:00:00Z'),
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
      updatedBy: 'Fixture Editor',
      updatedAt: new Date('2026-05-06T10:00:00Z'),
      editHref: groupsHref('tradition', { query }, { edit: slug }),
      editHeading: { eyebrow: 'Edit Tradition', title: name },
    };
  });

// The traditions take a name search (MB.115), empty until one is asked.
export const Traditions: Story = () => (
  <GroupList
    kind="tradition"
    groups={traditions(['Fixtural', 'Mockish', 'Testwort Rite'])}
    filter={{ query: '' }}
  />
);

// Searched by a fragment of the name, Clear drawn at the row's end.
export const TraditionsSearched: Story = () => (
  <GroupList
    kind="tradition"
    groups={traditions(['Fixtural', 'Fixture Rite'], 'fixtur')}
    filter={{ query: 'fixtur' }}
  />
);

// At a phone's width, searched, in each theme: the Name field across the
// row with its magnifier, Clear beneath it, each row a card.
export const TraditionsSearchedPhoneDark: Story = () => (
  <OnItsPage kind="tradition">
    <TraditionsSearched />
  </OnItsPage>
);
TraditionsSearchedPhoneDark.meta = { theme: 'dark', width: 375 };

export const TraditionsSearchedPhoneLight: Story = () => (
  <OnItsPage kind="tradition">
    <TraditionsSearched />
  </OnItsPage>
);
TraditionsSearchedPhoneLight.meta = { theme: 'light', width: 375 };

// A search matching nothing says what to change.
export const TraditionsNoMatch: Story = () => (
  <GroupList kind="tradition" groups={[]} filter={{ query: 'nothing' }} />
);

export const Empty: Story = () => <GroupList kind="form" groups={[]} />;

// The traditions' empty message names them.
export const TraditionsEmpty: Story = () => (
  <GroupList kind="tradition" groups={[]} filter={{ query: '' }} />
);
