import type { Meta, StoryObj } from '@storybook/nextjs-vite';
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
type Story = StoryObj<typeof meta>;

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

export const Default: Story = {
  render: () => (
    <Frame>
      <StackTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} empty="" />
    </Frame>
  ),
};

export const Roomy: Story = {
  render: () => (
    <Frame>
      <StackTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        empty=""
        className="data-table--roomy"
      />
    </Frame>
  ),
};

export const Empty: Story = {
  render: () => (
    <Frame>
      <StackTable
        columns={COLUMNS}
        rows={[]}
        rowKey={(row) => row.id}
        empty="There are no groups yet. Add one with Add Group."
      />
    </Frame>
  ),
};
