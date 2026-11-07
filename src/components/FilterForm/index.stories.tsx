import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GROUP_NAMES, asSlugs } from '../../../.storybook/fixtures';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { SearchField } from '../Field';
import FilterForm from '.';
import GroupedValueListFilter from '../GroupedValueList/filter';
import type { GroupedValueListFilter as Shown } from '../GroupedValueList/types';
import ListFrame from '../ListFrame';

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

const FILTER: Shown = { query: 'test', group: GROUPS[0].slug };

const Bare = ({ clear, sorrel }: { clear?: boolean; sorrel?: boolean }) => {
  const [query, setQuery] = useState('test');
  return (
    <ListFrame>
      <FilterForm
        label="Filter Categories"
        action="/curator/categories"
        searchHref={() => '/curator/categories'}
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

const STATES: Record<string, ReactNode> = {
  'No Filter': <Framed />,
  Filtered: <Framed shown={FILTER} />,
  'Without Clear': <Bare clear={false} />,
  'With Sorrel': <Bare sorrel />,
};

export const States: Story = {
  args: { state: 'No Filter' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};

export const Narrow: Story = {
  globals: { viewport: { value: 'w375', isRotated: false } },
  render: () => <Framed shown={FILTER} />,
};
