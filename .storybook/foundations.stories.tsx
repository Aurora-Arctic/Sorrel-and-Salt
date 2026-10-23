import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Foundations from './foundations';

// Sits in .storybook/ because Foundations is not a component the app imports.
// Render-only: `workshop:build` catches an unresolvable import, not a throw.
// See claude-docs/workshop.md, "Commands and gates".
const meta = {
  title: 'Foundations',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Follows the toolbar's theme control.
export const Default: Story = { render: () => <Foundations /> };
