import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { ShellFrame } from '../../../.storybook/shell-frame';
import PasswordSection from '.';

const meta = {
  title: 'Account / Password Section',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const Section = ({ hasPassword }: { hasPassword: boolean }) => (
  <ShellFrame area="none" open="/account">
    <main className="page-frame page-frame--narrow">
      <h1>Your Account</h1>
      <section
        id="account-password"
        className="page-frame__section panel"
        aria-labelledby="account-password-heading"
      >
        <div className="header">
          <h2 id="account-password-heading">Password</h2>
          <p className="lede">
            {hasPassword
              ? 'Changing your password signs out every other device signed in to your account.'
              : 'Set a password to sign in with your email address as well as your providers.'}
          </p>
        </div>
        <PasswordSection hasPassword={hasPassword} />
      </section>
    </main>
  </ShellFrame>
);

const STATES_STATES: Record<string, ReactNode> = {
  Change: <Section hasPassword />,
  Set: <Section hasPassword={false} />,
};

export const States: Story = {
  args: { state: 'Change' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
