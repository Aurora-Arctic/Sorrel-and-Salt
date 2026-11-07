import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { verifyEmailMessage } from './verify-email';
import type { ProviderId } from '../lib/types';

const meta = {
  title: 'Emails / Verify Email',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const URL = 'https://sorrelandsalt.com/api/auth/verify-email?token=workshop.preview.token';

const preview = (providers: readonly ProviderId[]) => () =>
  verifyEmailMessage({
    to: 'someone@example.com',
    url: URL,
    providers,
    origin: WORKSHOP_ORIGIN,
  });

const oneProvider = preview(['microsoft']);
const twoProviders = preview(['facebook', 'microsoft']);
const noProvider = preview([]);
const change = () =>
  verifyEmailMessage({
    to: 'someone@example.com',
    url: URL,
    purpose: 'change',
    providers: ['discord'],
    origin: WORKSHOP_ORIGIN,
  });

const defaultNode = <EmailPreview message={oneProvider} />;

const twoProvidersNode = <EmailPreview message={twoProviders} />;

const noProviderNode = <EmailPreview message={noProvider} />;

const changeNode = <EmailPreview message={change} />;

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Two Providers': twoProvidersNode,
  'No Provider': noProviderNode,
  Change: changeNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
