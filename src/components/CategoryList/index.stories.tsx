import type { Story } from '@ladle/react';
import CategoryList from '.';
import { slugify } from '../../lib/slugify';
import { categoriesHref } from './href';
import type { CategoryGroupOption, CategoryListFilter } from './types';

// Render-only; behaviour is asserted in tests/components/CategoryList. The
// filter reaches `/admin/categories`, which the workshop does not serve.
export default {
  title: 'Admin / Category List',
};

const GROUPS: readonly CategoryGroupOption[] = [
  { slug: 'fixture-healing', name: 'Fixture Healing' },
  { slug: 'fixture-protection', name: 'Fixture Protection' },
];

const NO_FILTER: CategoryListFilter = { query: '', group: '' };

// Two of the seed's colour pairs, copied from src/db/seed/category-groups.ts,
// which a component may not import, on the invented groups.
const COLORS: Record<string, { colorDark: string; colorLight: string }> = {
  'Fixture Protection': { colorDark: '#5d8ab1', colorLight: '#286ba6' },
  'Fixture Healing': { colorDark: '#559c54', colorLight: '#326d31' },
};

const entry = (name: string, groupName: string, description: string) => {
  const slug = slugify(name);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName,
    groupColors: COLORS[groupName],
    editHref: categoriesHref({}, { edit: slug }),
  };
};

export const OnePageOfSeveral: Story = () => (
  <CategoryList
    categories={[
      entry('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
      entry('Testward', 'Fixture Protection', 'Another, guarding nothing in particular.'),
      entry('Fixture Mending', 'Fixture Healing', 'Invented too.'),
    ]}
    filter={NO_FILTER}
    groups={GROUPS}
    previousHref={categoriesHref({ before: 'cursor' })}
    nextHref={categoriesHref({ after: 'cursor' })}
  />
);

// Next alone still sits at the right, where it is on every other page.
export const FirstPage: Story = () => (
  <CategoryList
    categories={[
      entry('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
    ]}
    filter={NO_FILTER}
    groups={GROUPS}
    nextHref={categoriesHref({ after: 'cursor' })}
  />
);

// Narrowed by part of a name and by a group (MB.178): the form shows both.
export const Filtered: Story = () => (
  <CategoryList
    categories={[
      entry('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
      entry('Testward', 'Fixture Protection', 'Another, guarding nothing in particular.'),
    ]}
    filter={{ query: 'test', group: 'fixture-protection' }}
    groups={GROUPS}
  />
);

export const NoMatch: Story = () => (
  <CategoryList
    categories={[]}
    filter={{ query: 'nothing', group: 'fixture-healing' }}
    groups={GROUPS}
  />
);

export const Empty: Story = () => (
  <CategoryList categories={[]} filter={NO_FILTER} groups={GROUPS} />
);
