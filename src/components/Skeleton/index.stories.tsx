import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import Skeleton from '.';
import SwapPanel from './swap-panel';

// Render-only; the skeleton announces itself once, as a status, and the bars
// are hidden from assistive technology. Each state is one shape.
const meta = {
  title: 'Feedback / Skeleton',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

// What a panel shows while the next one loads: the skeleton in the panel's own place.
const swapPendingNode = (
  <SwapPanel pending className="tabbed-page__panel" skeleton={<Skeleton shape="block" count={3} />}>
    <p>The content that replaces it.</p>
  </SwapPanel>
);

const SKELETON_STATES: Record<string, ReactNode> = {
  Line: <Skeleton shape="line" />,
  'Lines With Count': <Skeleton shape="line" count={3} />,
  Block: <Skeleton shape="block" />,
  'Blocks With Count': <Skeleton shape="block" count={4} />,
  'Swap Panel Pending': swapPendingNode,
};

export const States: Story = {
  args: { state: 'Line' },
  argTypes: {
    state: { control: 'select', options: Object.keys(SKELETON_STATES), mapping: SKELETON_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
