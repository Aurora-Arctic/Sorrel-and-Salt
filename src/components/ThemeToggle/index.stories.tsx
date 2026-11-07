import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import ThemeToggle from '.';

const meta = {
  title: 'Layout / Theme Toggle',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const defaultNode = <ThemeToggle />;

export const ReducedMotion: Story = {
  render: () => <ThemeToggle />,
  parameters: { reducedMotion: true },
};
const inlineNode = <ThemeToggle variant="inline" />;

const TOGGLE_STATES: Record<string, ReactNode> = {
  Corner: defaultNode,
  Inline: inlineNode,
};

export const States: Story = {
  args: { state: 'Corner' },
  argTypes: {
    state: { control: 'select', options: Object.keys(TOGGLE_STATES), mapping: TOGGLE_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
