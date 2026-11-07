import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { passwordChangedMessage } from './password-changed';
import type { PasswordChange } from './types';

// Render-only; content is asserted in tests/emails/password-changed.test.tsx.
const meta = {
  title: 'Emails / Password Changed',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const preview = (how: PasswordChange) => () =>
  passwordChangedMessage({
    to: 'someone@example.com',
    url: 'https://sorrelandsalt.com/forgot-password',
    how,
    origin: WORKSHOP_ORIGIN,
  });

const reset = preview('reset');
const change = preview('change');
const set = preview('set');

const STATES: Record<string, ReactNode> = {
  Reset: <EmailPreview message={reset} />,
  Change: <EmailPreview message={change} />,
  Set: <EmailPreview message={set} />,
};

export const States: Story = {
  args: { state: 'Reset' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES), mapping: STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
