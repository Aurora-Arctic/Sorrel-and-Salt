import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ListFrame from '../ListFrame';
import Pager from '.';

// Render-only; behaviour is asserted in tests/components/Pager. A pager sits
// in its list's ListFrame, which holds its navigation.
const meta = {
  title: 'Layout / Pager',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = {
  render: () => (
    <ListFrame>
      <Pager nextHref="?after=cursor" />
    </ListFrame>
  ),
};

export const Default: Story = {
  render: () => (
    <ListFrame>
      <Pager
        previousHref="?before=cursor"
        nextHref="?after=cursor"
        position={{ page: 2, pages: 3 }}
      />
    </ListFrame>
  ),
};

export const LastPage: Story = {
  render: () => (
    <ListFrame>
      <Pager previousHref="?before=cursor" />
    </ListFrame>
  ),
};
