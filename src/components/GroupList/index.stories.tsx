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

export const Empty: Story = () => <GroupList kind="form" groups={[]} />;
