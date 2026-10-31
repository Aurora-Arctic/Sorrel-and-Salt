import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import ResetPasswordForm from '.';
import type { ResetPasswordFormProps } from './types';

// Render-only; behaviour is asserted in tests/components/ResetPasswordForm. Nothing is mocked: a submit
// fails into the alert region.
const meta = {
  title: 'Sign In / Reset Password Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

// Inside the page's own frame and panel (src/app/reset-password/page.tsx), so the workshop shows what the
// page shows.
const Page = (props: ResetPasswordFormProps) => (
  <main className="page-frame page-frame--narrow">
    <div className="panel">
      <div className="header">
        <h1 className="reset-password-form__heading">Choose a New Password</h1>
        <p className="lede">Your new password signs out every device signed in to your account.</p>
      </div>
      <ResetPasswordForm {...props} />
    </div>
  </main>
);

const STATES_STATES: Record<string, ReactNode> = {
  // The mailed link followed in time: a token to spend.
  Default: <Page token="example" />,
  // A link spent or past its 15 minutes: no form, an offer of a new link.
  'Spent Link': <Page />,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
