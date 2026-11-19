import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, useState } from 'react';
import { ReorderMode, ReorderToggle, useReorderMode } from '.';

const meta = {
  title: 'Controls / Reorder Mode',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function State(): ReactElement {
  const { reordering } = useReorderMode();
  return <p>{reordering ? 'Move Up and Move Down show.' : 'Each grip shows alone.'}</p>;
}

export const Off: Story = {
  render: () => (
    <ReorderMode name="Steps">
      <ReorderToggle />
      <State />
    </ReorderMode>
  ),
};

function Held(): ReactElement {
  const [on, setOn] = useState(true);
  return (
    <ReorderMode name="Guides" on={on} onChange={setOn}>
      <ReorderToggle />
      <State />
    </ReorderMode>
  );
}

export const On: Story = { render: () => <Held /> };
