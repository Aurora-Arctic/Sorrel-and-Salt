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

// Render-only; behaviour is asserted in tests/components/GroupedValueList.
// The filter reaches the admin pages (`/admin/categories` and the rest),
// which the workshop does not serve.
const meta = {
  title: 'Admin / Grouped Value List',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const NO_FILTER: GroupedValueListFilter = { query: '', group: '' };

// Each kind's groups enough to narrow: the group filter is typed into once
// hydrated, so typing in it shows its list narrowing.
const CATEGORY_GROUPS = asSlugs(GROUP_NAMES.category);

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
    ...FIXTURE_EDIT,
    editHref: groupedValuesHref('category', {}, { edit: slug }),
    editHeading: { eyebrow: 'Edit Category', title: name },
  };
};

const FORM_GROUPS = asSlugs(GROUP_NAMES.form);

// Two of the invented groups carry an icon; any other shows the generic.
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

// The paging, narrowing, no-match and empty states are the list's own and are
// the same for every kind, so only the categories show them; the other kinds
// show what differs: the form's icon, the deity's tradition filter, the flat
// kinds' missing group column and filter.
// The Categories tab as the route draws it (`/admin/categories`): the app shell, the admin row, the
// heading with its toggle and Add Category, then the Name and Group filters over the list.
const defaultNode = (
  <AdminTabbedFrame
    shell
    page="categories"
    action={
      <Link className="btn btn--solid" href={'/admin/categories?new' as Route}>
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

// Next alone still sits at the right, where it is on every other page.
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

// Narrowed by part of a name and by a group: the form shows both.
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

// A form's row draws its group's icon.
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

// By tradition then name, as the service reads them.
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

// The flat kinds, here the celestial bodies: no group column and no
// group filter. The zodiac signs draw the same.
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

// Inside the admin layout and the Categories page with its Categories tab
// open, as the page draws it; at a phone's width, the tab's Add
// at its own width beneath the heading, the filter stacked and each row a
// card. The page and the filter are the real `TabbedPage` and
// `FilterForm`, so these show what the sign-off settled.
const CategoriesPage = () => (
  <AdminTabbedFrame
    page="categories"
    action={
      <Link className="btn btn--solid" href={'/admin/categories?new' as Route}>
        Add Category
      </Link>
    }
  >
    <FilteredView />
  </AdminTabbedFrame>
);

// The same page with a filter applied and the filtered list on its way: the filter row greyed and off, and the tabs' skeleton,
// rows and pager, in place of the list. The workshop's router goes nowhere,
// so a list navigation provided above the page holds one on its way, as the
// tabbed page's own Loading stories do.
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
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
