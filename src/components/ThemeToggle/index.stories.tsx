import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ThemeToggle from '.';

// Render-only; behaviour is asserted in tests/components/ThemeToggle. A story
// pins a theme with `.meta = { theme }`, which the decorator honours over the toolbar.
const meta = {
  title: 'Layout / Theme Toggle',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Follows the toolbar's theme control. The first four stories draw the
// `corner` variant, as the root layout mounts it on the pages with no shell
// (Welcome, Sign In and the invitation page): a
// quarter disc pinned to the story frame's top-right corner and clipped by its
// edge, which is the design.
export const Default: Story = { render: () => <ThemeToggle /> };

// `.meta = { reducedMotion: true }` simulates the OS setting (.storybook/components.tsx):
// transitions drop to instant and a click parks the outgoing facet at once.
export const ReducedMotion: Story = {
  render: () => <ThemeToggle />,
  parameters: { reducedMotion: true },
};
// The disc in the flow, as the shell's bar draws it (AppShell's stories show it
// there, in the bar). No clip, no fixed position.
export const Inline: Story = { render: () => <ThemeToggle variant="inline" /> };
