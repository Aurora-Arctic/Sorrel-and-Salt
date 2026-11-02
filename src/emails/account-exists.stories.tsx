import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { accountExistsMessage } from './account-exists';
import type { ProviderId } from '../lib/types';

// Render-only; content is asserted in tests/emails/account-exists.test.tsx. The link is invented and goes
// nowhere; the images and fonts come from the workshop, which serves public/.
const meta = {
  title: 'Emails / Account Exists',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const URL = 'https://sorrelandsalt.com/sign-in';

// Module-level, so each story hands the preview the same function every render.
const preview = (providers: readonly ProviderId[], hasPassword: boolean) => () =>
  accountExistsMessage({
    to: 'someone@example.com',
    url: URL,
    providers,
    hasPassword,
    origin: WORKSHOP_ORIGIN,
  });

const password = preview([], true);
const provider = preview(['google'], false);
const both = preview(['discord', 'microsoft'], true);

const STATES: Record<string, ReactNode> = {
  // Follows the toolbar's theme control, as the mail follows a reader's setting.
  Password: <EmailPreview message={password} />,
  Provider: <EmailPreview message={provider} />,
  'Password and Providers': <EmailPreview message={both} />,
};

export const States: Story = {
  args: { state: 'Password' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES), mapping: STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
