import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PanelSection from '.';

const meta = {
  title: 'Layout / Panel Section',
  component: PanelSection,
} satisfies Meta<typeof PanelSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithLede: Story = {
  args: {
    id: 'account-name',
    title: 'Name',
    lede: 'The name Sorrel & Salt shows for you.',
    children: <p>The section&rsquo;s form.</p>,
  },
};

export const WithoutLede: Story = {
  args: { id: 'account-email', title: 'Email', children: <p>The section&rsquo;s form.</p> },
};
