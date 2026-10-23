import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { verifyEmailMessage } from './verify-email';
import type { ProviderId } from '../lib/types';

// Render-only; content is asserted in tests/emails/verify-email.test.tsx. The
// link is invented and goes nowhere; the images and fonts come from the
// workshop, which serves public/.
const meta = {
  title: 'Emails / Verify Email',
} satisfies Meta;
export default meta;
// The dropdown story's `state` arg is the node it draws (see its argTypes mapping).
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const URL = 'https://sorrelandsalt.com/api/auth/verify-email?token=workshop.preview.token';

// Module-level, so each story hands the preview the same function every render.
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

// Follows the toolbar's theme control, as the mail follows a reader's setting.
const defaultNode = <EmailPreview message={oneProvider} />;

const twoProvidersNode = <EmailPreview message={twoProviders} />;

// No linked account on record: the sentence stops at the address.
const noProviderNode = <EmailPreview message={noProvider} />;

// An existing account asking for this address (MB.54): the first sentence changes.
const changeNode = <EmailPreview message={change} />;

// One story with a control to choose the state: each is a whole page or list,
// too big to sit beside the others (claude-docs/workshop.md, rule 5).
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
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
