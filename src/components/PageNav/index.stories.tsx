import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PageNav from '.';

// Render-only; behaviour is asserted in tests/components/PageNav. With no
// sections on the page the first entry stays current.
const meta = {
  title: 'Navigation / Page Nav',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const DefaultView = () => (
  <PageNav
    label="On This Page"
    entries={[
      { href: '#one', label: 'Name' },
      { href: '#two', label: 'Email' },
      { href: '#three', label: 'Sign-In Methods' },
    ]}
  />
);

export const Default: Story = { render: DefaultView };

// A run of entries under a group's label, as the ingredient page puts its
// forms under Forms (M8.19).
const GroupedView = () => (
  <PageNav
    label="On This Page"
    entries={[
      { href: '#one', label: 'Details' },
      { href: '#two', label: 'Root', group: 'Forms' },
      { href: '#three', label: 'Oil', group: 'Forms' },
      { href: '#four', label: 'Smoke Bundle', group: 'Forms' },
    ]}
  />
);

export const Grouped: Story = { render: GroupedView };

// A group set apart by its first entry, as References is when the page has
// notes: the break and the short rule halfway through it.
const GroupedApartView = () => (
  <PageNav
    label="On This Page"
    entries={[
      { href: '#one', label: 'Details' },
      { href: '#two', label: 'Root', group: 'Forms' },
      { href: '#three', label: 'Oil', group: 'Forms' },
      { href: '#four', label: 'Notes', group: 'References', apart: true },
      { href: '#five', label: 'Bibliography', group: 'References' },
    ]}
  />
);

export const GroupedApart: Story = { render: GroupedApartView };
