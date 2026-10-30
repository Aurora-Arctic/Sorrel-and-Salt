import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import ThemeToggle from '.';

// Render-only; behaviour is asserted in tests/components/ThemeToggle. A story
// pins a theme with `.meta = { theme }`, which the decorator honours over the toolbar.
const meta = {
  title: 'Layout / Theme Toggle',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// Follows the toolbar's theme control. The first four stories draw the `corner`
// variant, as the root layout mounts it on pages with no shell: a quarter disc
// pinned to the frame's top-right corner and clipped by its edge.
const defaultNode = <ThemeToggle />;

// `.meta = { reducedMotion: true }` simulates the OS setting (.storybook/components.tsx):
// transitions drop to instant and a click parks the outgoing facet at once.
export const ReducedMotion: Story = {
  render: () => <ThemeToggle />,
  parameters: { reducedMotion: true },
};
// The disc in the flow, as the shell's bar draws it (AppShell's stories show it
// there, in the bar). No clip, no fixed position.
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
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
