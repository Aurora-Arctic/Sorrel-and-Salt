import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import ListFrame from '../ListFrame';
import Pager from '.';

// Render-only; behaviour is asserted in tests/components/Pager. A pager sits
// in its list's ListFrame, which holds its navigation.
const meta = {
  title: 'Layout / Pager',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="24rem"
      states={{
        'First Page': (
          <ListFrame>
            <Pager nextHref="?after=cursor" />
          </ListFrame>
        ),
        'Middle Page': (
          <ListFrame>
            <Pager
              previousHref="?before=cursor"
              nextHref="?after=cursor"
              position={{ page: 2, pages: 3 }}
            />
          </ListFrame>
        ),
        'Last Page': (
          <ListFrame>
            <Pager previousHref="?before=cursor" />
          </ListFrame>
        ),
      }}
    />
  ),
};
