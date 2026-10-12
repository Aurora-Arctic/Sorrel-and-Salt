import type { Story } from '@ladle/react';
import GroupList from '.';
import { slugify } from '../../lib/slugify';
import { groupsHref } from './href';

// Render-only; behaviour is asserted in tests/components/GroupList. Three of
// the seed's colour pairs, copied from src/db/seed/category-groups.ts, which a
// component may not import (CLAUDE.md rule 1), on invented groups.
export default {
  title: 'Admin / Group List',
};

const CATEGORY_GROUPS = [
  { name: 'Fixture Mending', colorDark: '#559c54', colorLight: '#326d31' },
  { name: 'Testcraft', colorDark: '#c371c6', colorLight: '#a13ba5' },
  { name: 'Testward', colorDark: '#5d8ab1', colorLight: '#286ba6' },
].map((group) => ({ ...group, description: 'An invented group, for the workshop.' }));

export const CategoryGroups: Story = () => (
  <GroupList
    kind="category"
    groups={CATEGORY_GROUPS.map((group) => {
      const slug = slugify(group.name);
      return { ...group, id: slug, slug, editHref: groupsHref('category', {}, { edit: slug }) };
    })}
  />
);

// At a phone's width, in the admin column, in each theme: each row a card.
export const PhoneDark: Story = () => (
  <div className="admin-layout">
    <CategoryGroups />
  </div>
);
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => (
  <div className="admin-layout">
    <CategoryGroups />
  </div>
);
PhoneLight.meta = { theme: 'light', width: 375 };

export const FormGroups: Story = () => (
  <GroupList
    kind="form"
    groups={['Fixture Mineral', 'Fixture Substance'].map((name) => {
      const slug = slugify(name);
      return {
        id: slug,
        name,
        slug,
        description: 'An invented group, for the workshop.',
        editHref: groupsHref('form', {}, { edit: slug }),
      };
    })}
    nextHref={groupsHref('form', { after: 'cursor' })}
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
      editHref: groupsHref('tradition', { query }, { edit: slug }),
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
  <div className="admin-layout">
    <TraditionsSearched />
  </div>
);
TraditionsSearchedPhoneDark.meta = { theme: 'dark', width: 375 };

export const TraditionsSearchedPhoneLight: Story = () => (
  <div className="admin-layout">
    <TraditionsSearched />
  </div>
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
