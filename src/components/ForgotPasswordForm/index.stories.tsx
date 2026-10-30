import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import ForgotPasswordForm from '.';

// Render-only; behaviour is asserted in tests/components/ForgotPasswordForm. Nothing is mocked: a submit
// fails into the alert region.
const meta = {
  title: 'Sign In / Forgot Password Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

// Inside the page's own frame and panel (src/app/forgot-password/page.tsx), so the workshop shows what the
// page shows.
const defaultNode = (
  <main className="page-frame page-frame--narrow">
    <div className="panel">
      <div className="header">
        <h1>Forgot Your Password?</h1>
        <p className="lede">
          Enter your email address and we&apos;ll send you a link to choose a new password.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  </main>
);

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
