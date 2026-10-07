import type { Story } from '@ladle/react';
import Pager from '.';

// Render-only; behaviour is asserted in tests/components/Pager.
export default {
  title: 'Layout / Pager',
};

export const FirstPage: Story = () => <Pager nextHref="?after=cursor" />;

export const MiddlePage: Story = () => (
  <Pager previousHref="?before=cursor" nextHref="?after=cursor" position={{ page: 2, pages: 3 }} />
);

export const LastPage: Story = () => <Pager previousHref="?before=cursor" />;
