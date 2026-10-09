import type { Story } from '@ladle/react';
import GroupedValueList from '.';
import { deitySlug, formSlug, slugify } from '../../lib/slugify';
import { groupedValuesHref } from './href';
import type { GroupedValueGroupOption, GroupedValueListFilter } from './types';

// Render-only; behaviour is asserted in tests/components/GroupedValueList.
// The filter reaches `/admin/categories`, `/admin/forms` or `/admin/deities`,
// which the workshop does not serve.
export default {
  title: 'Admin / Grouped Value List',
};

const NO_FILTER: GroupedValueListFilter = { query: '', group: '' };

const CATEGORY_GROUPS: readonly GroupedValueGroupOption[] = [
  { slug: 'fixture-healing', name: 'Fixture Healing' },
  { slug: 'fixture-protection', name: 'Fixture Protection' },
];

// Two of the seed's colour pairs, copied from src/db/seed/category-groups.ts,
// which a component may not import, on the invented groups.
const COLORS: Record<string, { colorDark: string; colorLight: string }> = {
  'Fixture Protection': { colorDark: '#5d8ab1', colorLight: '#286ba6' },
  'Fixture Healing': { colorDark: '#559c54', colorLight: '#326d31' },
};

const category = (name: string, groupName: string, description: string) => {
  const slug = slugify(name);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName,
    groupColors: COLORS[groupName],
    editHref: groupedValuesHref('category', {}, { edit: slug }),
  };
};

const FORM_GROUPS: readonly GroupedValueGroupOption[] = [
  { slug: 'fixture-mineral', name: 'Fixture Mineral' },
  { slug: 'fixture-substance', name: 'Fixture Substance' },
];

const form = (name: string, groupName: string, description: string) => {
  const slug = formSlug(name, groupName);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName,
    editHref: groupedValuesHref('form', {}, { edit: slug }),
  };
};

const TRADITIONS: readonly GroupedValueGroupOption[] = [
  { slug: 'fixtural', name: 'Fixtural' },
  { slug: 'mockish', name: 'Mockish' },
];

const deity = (name: string, groupName: string, description: string) => {
  const slug = deitySlug(name, groupName);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName,
    editHref: groupedValuesHref('deity', {}, { edit: slug }),
  };
};

export const CategoriesOnePageOfSeveral: Story = () => (
  <GroupedValueList
    kind="category"
    values={[
      category('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
      category('Testward', 'Fixture Protection', 'Another, guarding nothing in particular.'),
      category('Fixture Mending', 'Fixture Healing', 'Invented too.'),
    ]}
    filter={NO_FILTER}
    groups={CATEGORY_GROUPS}
    previousHref={groupedValuesHref('category', { before: 'cursor' })}
    nextHref={groupedValuesHref('category', { after: 'cursor' })}
  />
);

// Next alone still sits at the right, where it is on every other page.
export const CategoriesFirstPage: Story = () => (
  <GroupedValueList
    kind="category"
    values={[
      category('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
    ]}
    filter={NO_FILTER}
    groups={CATEGORY_GROUPS}
    nextHref={groupedValuesHref('category', { after: 'cursor' })}
  />
);

// Narrowed by part of a name and by a group (MB.178): the form shows both.
export const CategoriesFiltered: Story = () => (
  <GroupedValueList
    kind="category"
    values={[
      category('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
      category('Testward', 'Fixture Protection', 'Another, guarding nothing in particular.'),
    ]}
    filter={{ query: 'test', group: 'fixture-protection' }}
    groups={CATEGORY_GROUPS}
  />
);

export const CategoriesNoMatch: Story = () => (
  <GroupedValueList
    kind="category"
    values={[]}
    filter={{ query: 'nothing', group: 'fixture-healing' }}
    groups={CATEGORY_GROUPS}
  />
);

export const CategoriesEmpty: Story = () => (
  <GroupedValueList kind="category" values={[]} filter={NO_FILTER} groups={CATEGORY_GROUPS} />
);

export const FormsOnePageOfSeveral: Story = () => (
  <GroupedValueList
    kind="form"
    values={[
      form('Testwort Shard', 'Fixture Mineral', 'An invented form, for the workshop.'),
      form('Testwort Sliver', 'Fixture Substance', 'Another, thinner than the first.'),
      form('Fixture Flake', 'Fixture Mineral', 'Invented too.'),
    ]}
    filter={NO_FILTER}
    groups={FORM_GROUPS}
    previousHref={groupedValuesHref('form', { before: 'cursor' })}
    nextHref={groupedValuesHref('form', { after: 'cursor' })}
    position={{ page: 2, pages: 3 }}
  />
);

export const FormsFirstPage: Story = () => (
  <GroupedValueList
    kind="form"
    values={[form('Testwort Shard', 'Fixture Mineral', 'An invented form, for the workshop.')]}
    filter={NO_FILTER}
    groups={FORM_GROUPS}
    nextHref={groupedValuesHref('form', { after: 'cursor' })}
    position={{ page: 1, pages: 2 }}
  />
);

export const FormsFiltered: Story = () => (
  <GroupedValueList
    kind="form"
    values={[
      form('Testwort Shard', 'Fixture Mineral', 'An invented form, for the workshop.'),
      form('Fixture Shard', 'Fixture Mineral', 'Invented too.'),
    ]}
    filter={{ query: 'shard', group: 'fixture-mineral' }}
    groups={FORM_GROUPS}
  />
);

export const FormsNoMatch: Story = () => (
  <GroupedValueList
    kind="form"
    values={[]}
    filter={{ query: 'nothing', group: 'fixture-substance' }}
    groups={FORM_GROUPS}
  />
);

export const FormsEmpty: Story = () => (
  <GroupedValueList kind="form" values={[]} filter={NO_FILTER} groups={FORM_GROUPS} />
);

// By tradition then name, as the service reads them.
export const DeitiesOnePageOfSeveral: Story = () => (
  <GroupedValueList
    kind="deity"
    values={[
      deity('Fixturo', 'Fixtural', 'Another, keeper of nothing in particular.'),
      deity('Testra', 'Fixtural', 'An invented deity, for the workshop.'),
      deity('Mockra', 'Mockish', 'Invented too.'),
    ]}
    filter={NO_FILTER}
    groups={TRADITIONS}
    previousHref={groupedValuesHref('deity', { before: 'cursor' })}
    nextHref={groupedValuesHref('deity', { after: 'cursor' })}
    position={{ page: 2, pages: 3 }}
  />
);

export const DeitiesFirstPage: Story = () => (
  <GroupedValueList
    kind="deity"
    values={[deity('Testra', 'Fixtural', 'An invented deity, for the workshop.')]}
    filter={NO_FILTER}
    groups={TRADITIONS}
    nextHref={groupedValuesHref('deity', { after: 'cursor' })}
    position={{ page: 1, pages: 2 }}
  />
);

export const DeitiesFiltered: Story = () => (
  <GroupedValueList
    kind="deity"
    values={[
      deity('Testra', 'Fixtural', 'An invented deity, for the workshop.'),
      deity('Fixtra', 'Fixtural', 'Invented too.'),
    ]}
    filter={{ query: 'tra', group: 'fixtural' }}
    groups={TRADITIONS}
  />
);

export const DeitiesNoMatch: Story = () => (
  <GroupedValueList
    kind="deity"
    values={[]}
    filter={{ query: 'nothing', group: 'mockish' }}
    groups={TRADITIONS}
  />
);

export const DeitiesEmpty: Story = () => (
  <GroupedValueList kind="deity" values={[]} filter={NO_FILTER} groups={TRADITIONS} />
);
