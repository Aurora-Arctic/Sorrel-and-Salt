import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { ShellFrame } from '../../../.storybook/shell-frame';
import PageNav from '../PageNav';
import NameForm from '.';

const meta = {
  title: 'Account / Name Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

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

const defaultNode = <Section name="Ada Fixture" />;

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
  render: ({ state }) => <div>{state}</div>,
};
