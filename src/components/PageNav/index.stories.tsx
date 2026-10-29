import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import PageNav from '.';

// Render-only; behaviour is asserted in tests/components/PageNav. With no
// sections on the page the first entry stays current.
const meta = {
  title: 'Navigation / Page Nav',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Grouped: a run of entries under a group's label, as the ingredient page puts its forms under Forms. Grouped Apart: a group set apart by its first entry, as References is when the page has
// notes: the break and the short rule halfway through it.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="20rem"
      states={{
        Plain: (
          <PageNav
            label="On This Page"
            entries={[
              { href: '#one', label: 'Name' },
              { href: '#two', label: 'Email' },
              { href: '#three', label: 'Sign-In Methods' },
            ]}
          />
        ),
        Grouped: (
          <PageNav
            label="On This Page"
            entries={[
              { href: '#one', label: 'Details' },
              { href: '#two', label: 'Root', group: 'Forms' },
              { href: '#three', label: 'Oil', group: 'Forms' },
              { href: '#four', label: 'Smoke Bundle', group: 'Forms' },
            ]}
          />
        ),
        'Grouped Apart': (
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
        ),
      }}
    />
  ),
};
