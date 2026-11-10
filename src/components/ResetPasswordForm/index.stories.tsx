import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import ResetPasswordForm from '.';
import type { ResetPasswordFormProps } from './types';

const meta = {
  title: 'Sign In / Reset Password Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const Page = (props: ResetPasswordFormProps) => (
  <main className="page-frame page-frame--narrow">
    <div className="panel">
      <div className="header">
        <h1 className="auth-title">Choose a New Password</h1>
        <p className="lede">Your new password signs out every device signed in to your account.</p>
      </div>
      <ResetPasswordForm {...props} />
    </div>
  </main>
);

const STATES_STATES: Record<string, ReactNode> = {
  Default: <Page token="example" />,
  'Spent Link': <Page />,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
