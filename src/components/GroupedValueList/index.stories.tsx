import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import GroupedValueList from '.';
import { deitySlug, formSlug, slugify } from '../../lib/slugify';
import { AdminTabbedFrame } from '../../../.storybook/admin-frame';
import { FIXTURE_EDIT, GROUP_NAMES, asSlugs } from '../../../.storybook/fixtures';
import { ListNavigationContext } from '../ListFrame';
import { groupedValuesHref } from './href';
import type { GroupedValueListFilter } from './types';

const meta = {
  title: 'Admin / Grouped Value List',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const NO_FILTER: GroupedValueListFilter = { query: '', group: '' };

const CATEGORY_GROUPS = asSlugs(GROUP_NAMES.category);

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
    ...FIXTURE_EDIT,
    editHref: groupedValuesHref('category', {}, { edit: slug }),
    editHeading: { eyebrow: 'Edit Category', title: name },
  };
};

const FORM_GROUPS = asSlugs(GROUP_NAMES.form);

const GLYPHS: Record<string, 'mineral' | 'botanical'> = {
  [GROUP_NAMES.form[0]]: 'mineral',
  [GROUP_NAMES.form[1]]: 'botanical',
};

const form = (name: string, groupName: string, description: string) => {
  const slug = formSlug(name, groupName);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName,
    groupIcon: GLYPHS[groupName] ?? null,
    ...FIXTURE_EDIT,
    editHref: groupedValuesHref('form', {}, { edit: slug }),
    editHeading: { eyebrow: 'Edit Form', title: name },
  };
};

const TRADITIONS = asSlugs(GROUP_NAMES.tradition);

const deity = (name: string, groupName: string, description: string) => {
  const slug = deitySlug(name, groupName);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName,
    ...FIXTURE_EDIT,
    editHref: groupedValuesHref('deity', {}, { edit: slug }),
    editHeading: { eyebrow: 'Edit Deity', title: name, qualifier: groupName },
  };
};

const defaultNode = (
  <AdminTabbedFrame
    shell
    page="categories"
    action={
      <Link className="btn btn--solid" href={'/curator/categories?new' as Route}>
        Add Category
      </Link>
    }
  >
    <GroupedValueList
      kind="category"
      values={[
        category('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
        category('Testward', 'Fixture Protection', 'Another, guarding nothing in particular.'),
        category('Fixture Mending', 'Fixture Healing', 'Invented too.'),
      ]}
      filter={NO_FILTER}
      groups={CATEGORY_GROUPS}
    />
  </AdminTabbedFrame>
);

const firstPageNode = (
  <GroupedValueList
    kind="category"
    values={[
      category('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
    ]}
    filter={NO_FILTER}
    groups={CATEGORY_GROUPS}
    nextHref={groupedValuesHref('category', { after: 'cursor' })}
    position={{ page: 1, pages: 2 }}
  />
);

const middlePageNode = (
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
    position={{ page: 2, pages: 3 }}
  />
);

const FilteredView = () => (
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

const filteredNode = <FilteredView />;

const noMatchesNode = (
  <GroupedValueList
    kind="category"
    values={[]}
    filter={{ query: 'nothing', group: 'fixture-healing' }}
    groups={CATEGORY_GROUPS}
  />
);

const emptyNode = (
  <GroupedValueList kind="category" values={[]} filter={NO_FILTER} groups={CATEGORY_GROUPS} />
);

const formsNode = (
  <GroupedValueList
    kind="form"
    values={[
      form('Testwort Shard', 'Fixture Mineral', 'An invented form, for the workshop.'),
      form('Testwort Sliver', 'Fixture Substance', 'Another, thinner than the first.'),
      form('Fixture Flake', 'Fixture Mineral', 'Invented too.'),
    ]}
    filter={NO_FILTER}
    groups={FORM_GROUPS}
  />
);

const deitiesNode = (
  <GroupedValueList
    kind="deity"
    values={[
      deity('Fixturo', 'Fixtural', 'Another, keeper of nothing in particular.'),
      {
        ...deity('Testra', 'Fixtural', 'An invented deity, for the workshop.'),
        otherNames: ['Testrina', 'Tess'],
      },
      deity('Mockra', 'Mockish', 'Invented too.'),
    ]}
    filter={NO_FILTER}
    groups={TRADITIONS}
  />
);

const flat = (kind: 'celestialBody' | 'zodiacSign', name: string, description: string) => {
  const slug = slugify(name);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName: '',
    ...FIXTURE_EDIT,
    editHref: groupedValuesHref(kind, {}, { edit: slug }),
    editHeading: { title: name },
  };
};

const celestialBodiesNode = (
  <GroupedValueList
    kind="celestialBody"
    values={[
      flat('celestialBody', 'Testwort Star', 'An invented body, for the workshop.'),
      flat('celestialBody', 'Fixture Comet', 'Another, with a longer tail than the first.'),
      flat('celestialBody', 'Fixture Moonlet', 'Invented too.'),
    ]}
    filter={NO_FILTER}
  />
);

const CategoriesPage = () => (
  <AdminTabbedFrame
    page="categories"
    action={
      <Link className="btn btn--solid" href={'/curator/categories?new' as Route}>
        Add Category
      </Link>
    }
  >
    <FilteredView />
  </AdminTabbedFrame>
);

const ON_ITS_WAY = { pending: true, searching: false, go: () => undefined };

const PendingView = () => (
  <ListNavigationContext.Provider value={ON_ITS_WAY}>
    <CategoriesPage />
  </ListNavigationContext.Provider>
);

export const Pending: Story = { render: () => <PendingView /> };

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'First Page': firstPageNode,
  'Middle Page': middlePageNode,
  Filtered: filteredNode,
  'No Matches': noMatchesNode,
  Empty: emptyNode,
  Forms: formsNode,
  Deities: deitiesNode,
  'Celestial Bodies': celestialBodiesNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
