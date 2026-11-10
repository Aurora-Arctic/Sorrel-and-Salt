import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import NarrowPanelPage from '.';

// Drawn as a `div` so the story holds no second `main` landmark.
const meta = {
  title: 'Layout / Narrow Panel Page',
  component: NarrowPanelPage,
  args: { as: 'div' },
} satisfies Meta<typeof NarrowPanelPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Create Coven',
    lede: 'Start a coven of your own. You will be its steward.',
    children: <p>The page&rsquo;s form.</p>,
  },
};
