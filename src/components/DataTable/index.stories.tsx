import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import type { Route } from 'next';

import { asOptions, GROUP_NAMES } from '../../../.storybook/fixtures';
import { EditLink } from '../IconTip';
import ListFrame, { ListBody } from '../ListFrame';
import type { ListBodyProps } from '../ListFrame/types';
import StackTable, { GroupChip } from '.';
import type { StackColumn } from './types';

// Render-only; the lists that hold it assert its behaviour, each in its own
// test. A table sits in its list's ListFrame, as every admin list holds it;
// narrow the window under 40rem to see the rows turn into cards.
const meta = {
  title: 'Layout / Data Table',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const PAIRS = [
  { colorDark: '#7fb38a', colorLight: '#2f6b3c' },
  { colorDark: '#c79bd8', colorLight: '#6d3d82' },
];

// Two groups in chips and two plain, as a form group or a tradition is drawn.
const ROWS = asOptions(GROUP_NAMES.category).map(({ id, name }, index) => ({
  id,
  name,
  description: 'A group the fixtures invent, for the workshop alone.',
  ...PAIRS[index],
}));

const COLUMNS: StackColumn<(typeof ROWS)[number]>[] = [
  { heading: 'Name', cell: (row) => <GroupChip name={row.name} colors={row} /> },
  { heading: 'Description', cell: (row) => row.description },
  {
    heading: 'Edit',
    hiddenHeading: true,
    action: 'corner',
    cell: (row) => (
      <EditLink href={'?edit' as Route} name={row.name} heading={{ title: row.name }} />
    ),
  },
];

const Frame = ({ children }: ListBodyProps) => (
  <ListFrame>
    <ListBody>{children}</ListBody>
  </ListFrame>
);

const defaultNode = (
  <Frame>
    <StackTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} empty="" />
  </Frame>
);

const roomyNode = (
  <Frame>
    <StackTable
      columns={COLUMNS}
      rows={ROWS}
      rowKey={(row) => row.id}
      empty=""
      className="data-table--roomy"
    />
  </Frame>
);

const emptyNode = (
  <Frame>
    <StackTable
      columns={COLUMNS}
      rows={[]}
      rowKey={(row) => row.id}
      empty="There are no groups yet. Add one with Add Group."
    />
  </Frame>
);

// A foot action spans the card's bottom instead of standing in its corner, the table is named
// for a page that holds several, and a group chip draws its icon.
const FOOT_COLUMNS: StackColumn<(typeof ROWS)[number]>[] = [
  {
    heading: 'Name',
    cell: (row) => (
      <GroupChip name={row.name} colors={row} icon={row.id === ROWS[0].id ? 'botanical' : null} />
    ),
  },
  { heading: 'Description', cell: (row) => row.description },
  {
    heading: 'Remove',
    action: 'foot',
    cell: () => (
      <button type="button" className="btn btn--destructive btn--small">
        Remove
      </button>
    ),
  },
];

const footActionNode = (
  <Frame>
    <h2>Groups</h2>
    <StackTable
      aria-label="Groups"
      columns={FOOT_COLUMNS}
      rows={ROWS}
      rowKey={(row) => row.id}
      empty=""
    />
  </Frame>
);

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Roomy: roomyNode,
  Empty: emptyNode,
  'Foot Action And Icon Chip': footActionNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
