import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { accountExistsMessage } from './account-exists';
import type { ProviderId } from '../lib/types';

const meta = {
  title: 'Emails / Account Exists',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const URL = 'https://sorrelandsalt.com/sign-in';

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
