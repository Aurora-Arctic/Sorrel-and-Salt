import type { Story } from '@ladle/react';
import ListFrame from '../ListFrame';
import Pager from '.';

// Render-only; behaviour is asserted in tests/components/Pager. A pager sits
// in its list's ListFrame, which holds its navigation.
export default {
  title: 'Layout / Pager',
};

export const FirstPage: Story = () => (
  <ListFrame>
    <Pager nextHref="?after=cursor" />
  </ListFrame>
);

export const MiddlePage: Story = () => (
  <ListFrame>
    <Pager
      previousHref="?before=cursor"
      nextHref="?after=cursor"
      position={{ page: 2, pages: 3 }}
    />
  </ListFrame>
);

export const LastPage: Story = () => (
  <ListFrame>
    <Pager previousHref="?before=cursor" />
  </ListFrame>
);
