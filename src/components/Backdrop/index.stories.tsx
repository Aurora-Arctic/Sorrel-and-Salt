import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import Backdrop from '.';

const meta = {
  title: 'Layout / Backdrop',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const BACKDROP_STATES: Record<string, ReactNode> = {
  'Every Page': <Backdrop />,
  'Front Door': (
    <div className="welcome-page">
      <Backdrop />
    </div>
  ),
};

export const States: Story = {
  args: { state: 'Every Page' },
  argTypes: {
    state: { control: 'select', options: Object.keys(BACKDROP_STATES), mapping: BACKDROP_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
