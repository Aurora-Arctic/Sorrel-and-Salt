import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { ShellFrame } from '../../../.storybook/shell-frame';
import PageNav from '../PageNav';
import NameForm from '.';

// Render-only; behaviour is asserted in tests/components/NameForm. The
// component talks to the network only on submit, so nothing is mocked — a
// submit in the workshop fails into the alert region. The TanStack Query
// client comes from the workshop's global provider (.storybook/components.tsx).
const meta = {
  title: 'Account / Name Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

// Inside the account page's frame and section, on its panel, as
// src/app/(shell)/account/page.tsx writes them, so the workshop shows what the page
// shows.
const Section = ({ name }: { name: string }) => (
  <ShellFrame area="none" open="/account">
    <main className="page-frame page-frame--narrow page-with-nav">
      <h1>Your Account</h1>
      <PageNav
        label="On This Page"
        entries={[
          { href: '#account-name', label: 'Name' },
          { href: '#account-email', label: 'Email' },
          { href: '#account-sign-in-methods', label: 'Sign-In Methods' },
          { href: '#account-invitations', label: 'Invitations' },
        ]}
      />
      <section
        id="account-name"
        className="page-frame__section panel"
        aria-labelledby="account-name-heading"
      >
        <div className="header">
          <h2 id="account-name-heading">Name</h2>
          <p className="lede">The name Sorrel &amp; Salt shows for you.</p>
        </div>
        <NameForm name={name} />
      </section>
    </main>
  </ShellFrame>
);

// The usual visit: the name the provider gave, nothing to save until edited.
const defaultNode = <Section name="Ada Fixture" />;

// A long name, to see the field hold it.
const longNameNode = (
  <Section name="Adelheid Wilhelmina Fixture-Testwort of the Lower Fixture Coven" />
);

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Long Name': longNameNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
