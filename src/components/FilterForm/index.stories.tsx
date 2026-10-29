import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GROUP_NAMES, asSlugs } from '../../../.storybook/fixtures';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { SearchField } from '../Field';
import FilterForm from '.';
import GroupedValueListFilter from '../GroupedValueList/filter';
import type { GroupedValueListFilter as Shown } from '../GroupedValueList/types';
import ListFrame from '../ListFrame';

// Render-only; the lists that use it assert their filters. FilterForm is drawn
// here as a list draws it: the categories list's own filter
// (`GroupedValueListFilter`, a Name search and a type-ahead Group select, no
// switch) inside a ListFrame, which holds the navigation it needs. The
// workshop's router goes nowhere, so a change shows nothing on its way here
// (GroupedValueList's `Pending` stories draw that). The search applies from
// its magnifier or Enter, the group on its pick, and Clear is drawn only
// while the page shows a filter. The groups are the workshop's invented ones.
const meta = {
  title: 'Admin / Filter Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const GROUPS = asSlugs(GROUP_NAMES.category);

const NO_FILTER: Shown = { query: '', group: '' };

const Framed = ({ shown = NO_FILTER }: { shown?: Shown }) => (
  <ListFrame>
    <GroupedValueListFilter kind="category" filter={shown} groups={GROUPS} />
  </ListFrame>
);

// A page showing a filter: Clear, a link to the page itself, ends the row.
const FILTER: Shown = { query: 'test', group: GROUPS[0].slug };

// The form drawn on its own, with a filter shown so Clear would be drawn.
const Bare = ({ clear, sorrel }: { clear?: boolean; sorrel?: boolean }) => {
  const [query, setQuery] = useState('test');
  return (
    <ListFrame>
      <FilterForm
        label="Filter Categories"
        action="/admin/categories"
        searchHref={() => '/admin/categories'}
        shown={['test']}
        clear={clear}
        sorrel={sorrel}
      >
        <SearchField
          label="Name"
          name="query"
          placeholder="Search names"
          value={query}
          onChange={setQuery}
        />
      </FilterForm>
    </ListFrame>
  );
};

// One story with a control to choose the state (claude-docs/workshop.md, rule 5):
//   No Filter: a page showing no filter, so nothing to clear and no Clear.
//   Filtered: a page showing a filter, so Clear, a link to the page itself, ends the row.
//   Without Clear: a row with its own Clear All turns Clear off, so a filter shows none.
//   With Sorrel: the layer a sticky row fills itself with, so the corner sorrel shows through it.
const STATES: Record<string, ReactNode> = {
  'No Filter': <Framed />,
  Filtered: <Framed shown={FILTER} />,
  'Without Clear': <Bare clear={false} />,
  'With Sorrel': <Bare sorrel />,
};

export const States: Story = {
  args: { state: 'No Filter' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};

// On a phone: the row stacks, the search over Clear. It stays a story of its own because the
// state is the viewport, which a control on a state cannot set.
export const Narrow: Story = {
  globals: { viewport: { value: 'w375', isRotated: false } },
  render: () => <Framed shown={FILTER} />,
};
