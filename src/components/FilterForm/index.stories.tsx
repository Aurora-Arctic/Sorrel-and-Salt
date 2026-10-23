import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GROUP_NAMES, asSlugs } from '../../../.storybook/fixtures';
import { useState } from 'react';
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
type Story = StoryObj<typeof meta>;

const GROUPS = asSlugs(GROUP_NAMES.category);

const NO_FILTER: Shown = { query: '', group: '' };

const Framed = ({ shown = NO_FILTER }: { shown?: Shown }) => (
  <ListFrame>
    <GroupedValueListFilter kind="category" filter={shown} groups={GROUPS} />
  </ListFrame>
);

// A page showing no filter: nothing to clear, so no Clear.
export const Default: Story = { render: () => <Framed /> };

// A page showing a filter: Clear, a link to the page itself, ends the row.
const FILTER: Shown = { query: 'test', group: GROUPS[0].slug };

export const Filtered: Story = { render: () => <Framed shown={FILTER} /> };

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

// A row with its own Clear All turns this one off, so a filter shows no Clear.
export const WithoutClear: Story = { render: () => <Bare clear={false} /> };

// The layer a sticky row fills itself with, so the corner sorrel shows through it.
export const WithSorrel: Story = { render: () => <Bare sorrel /> };

// On a phone: the row stacks, the search over Clear.
export const Narrow: Story = {
  globals: { viewport: { value: 'w375', isRotated: false } },
  render: () => <Framed shown={FILTER} />,
};
