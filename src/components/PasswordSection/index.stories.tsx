import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { ShellFrame } from '../../../.storybook/shell-frame';
import PasswordSection from '.';

// Render-only; behaviour is asserted in tests/components/PasswordSection. Nothing is mocked: a submit
// fails into the alert region. The TanStack Query client comes from the workshop's global provider
// (.storybook/components.tsx).
const meta = {
  title: 'Account / Password Section',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

// Inside the account page's frame and section, on its panel, as src/app/(shell)/account/page.tsx writes
// them, so the workshop shows what the page shows.
const Section = ({
  hasPassword,
  twoFactorEnabled = false,
}: {
  hasPassword: boolean;
  twoFactorEnabled?: boolean;
}) => (
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
        <PasswordSection hasPassword={hasPassword} twoFactorEnabled={twoFactorEnabled} />
      </section>
    </main>
  </ShellFrame>
);

const STATES_STATES: Record<string, ReactNode> = {
  // An account with a password changes it, asked for the current one.
  Change: <Section hasPassword />,
  // An account with providers alone sets a first one.
  Set: <Section hasPassword={false} />,
  // Two-factor on, offering to turn it off with the password.
  'Two-Factor On': <Section hasPassword twoFactorEnabled />,
};

export const States: Story = {
  args: { state: 'Change' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
