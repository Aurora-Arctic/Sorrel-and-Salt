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

// A run of entries under a group's label, as the ingredient page puts its
// forms under Forms (M8.19).
export const Grouped: Story = () => (
  <PageNav
    label="On this page"
    entries={[
      { href: '#one', label: 'Details' },
      { href: '#two', label: 'Root', group: 'Forms' },
      { href: '#three', label: 'Oil', group: 'Forms' },
      { href: '#four', label: 'Smoke Bundle', group: 'Forms' },
    ]}
  />
);

// A group set apart by its first entry, as References is when the page has
// notes: the break and the short rule halfway through it.
export const GroupedApart: Story = () => (
  <PageNav
    label="On this page"
    entries={[
      { href: '#one', label: 'Details' },
      { href: '#two', label: 'Root', group: 'Forms' },
      { href: '#three', label: 'Oil', group: 'Forms' },
      { href: '#four', label: 'Notes', group: 'References', apart: true },
      { href: '#five', label: 'Bibliography', group: 'References' },
    ]}
  />
);

export const GroupedApartPhone: Story = () => <GroupedApart />;
GroupedApartPhone.meta = { width: 375 };

export const GroupedPhone: Story = () => <Grouped />;
GroupedPhone.meta = { width: 375 };

// A phone's width: the bar on the left, the text left-aligned.
export const Phone: Story = () => <Default />;
Phone.meta = { width: 375 };

export const PhoneDark: Story = () => <Default />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Default />;
PhoneLight.meta = { theme: 'light', width: 375 };
