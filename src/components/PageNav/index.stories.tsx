import type { Story } from '@ladle/react';
import PageNav from '.';

// Render-only; behaviour is asserted in tests/components/PageNav. With no
// sections on the page the first entry stays current.
export default {
  title: 'Navigation / Page Nav',
};

export const Default: Story = () => (
  <PageNav
    label="On this page"
    entries={[
      { href: '#one', label: 'Name' },
      { href: '#two', label: 'Email' },
      { href: '#three', label: 'Sign-In Methods' },
    ]}
  />
);

// A phone's width: the bar on the left, the text left-aligned.
export const Phone: Story = () => <Default />;
Phone.meta = { width: 375 };
