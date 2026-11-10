import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { hangAuth, refuseAuth } from '../../../.storybook/mock-api';
import { usePressOnMount } from '../../../.storybook/press';
import { authClient } from '../../lib/auth-client';
import { LAST_USED_PROVIDER_COOKIE, signInErrorMessage } from '../../lib/sign-in';
import SignInPanel from '.';
import type { SignInPanelProps } from './types';

const meta = {
  title: 'Sign In / Panel',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const ALL_PROVIDERS = ['discord', 'google', 'facebook', 'microsoft'] as const;

// The panel reads the last-used mark from a cookie that outlives the story that wrote it, so
// every story sets or clears it first.
function lastUsed(provider: (typeof ALL_PROVIDERS)[number] | 'email' | null): void {
  if (provider) document.cookie = `${LAST_USED_PROVIDER_COOKIE}=${provider}; path=/`;
  else authClient.clearLastUsedLoginMethod();
}

const Page = (props: SignInPanelProps) => (
  <main className="page-frame page-frame--narrow">
    <SignInPanel {...props} />
  </main>
);

const DefaultView = () => {
  lastUsed(null);
  return <Page next="/" configured={ALL_PROVIDERS} />;
};
const defaultNode = <DefaultView />;

const LastUsedView = () => {
  lastUsed('discord');
  return <Page next="/" configured={ALL_PROVIDERS} />;
};
const lastUsedNode = <LastUsedView />;

// The workshop's router reads the query from `parameters.nextjs.navigation`, as pushState does
// not reach it.
const EMAIL_VIEW_PARAMETERS = { nextjs: { navigation: { query: { method: 'email' } } } };

export const EmailView: Story = {
  parameters: EMAIL_VIEW_PARAMETERS,
  render: () => {
    lastUsed(null);
    return <Page next="/" configured={ALL_PROVIDERS} />;
  },
};

export const PasswordLastUsed: Story = {
  parameters: EMAIL_VIEW_PARAMETERS,
  render: () => {
    lastUsed('email');
    return <Page next="/" configured={ALL_PROVIDERS} />;
  },
};

const CreateAnAccountView = () => {
  lastUsed(null);
  return <Page next="/" configured={ALL_PROVIDERS} mode="sign-up" />;
};
const createAnAccountNode = <CreateAnAccountView />;

const WithErrorView = () => {
  lastUsed(null);
  return <Page next="/" error={signInErrorMessage('email_not_found')} configured={ALL_PROVIDERS} />;
};
const withErrorNode = <WithErrorView />;

const SomeUnavailableView = () => {
  lastUsed(null);
  return <Page next="/" configured={['google']} />;
};
const someUnavailableNode = <SomeUnavailableView />;

export const Pending: Story = {
  beforeEach: ({ msw }) => msw.use(hangAuth()),
  render: () => {
    lastUsed(null);
    usePressOnMount('Continue with Google');
    return <Page next="/" configured={ALL_PROVIDERS} />;
  },
};

export const Failed: Story = {
  tags: ['expects-failed-request'],
  beforeEach: ({ msw }) => msw.use(refuseAuth()),
  render: () => {
    lastUsed(null);
    usePressOnMount('Continue with Google');
    return <Page next="/" configured={ALL_PROVIDERS} />;
  },
};

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Last Used': lastUsedNode,
  'Create an Account': createAnAccountNode,
  'With Error': withErrorNode,
  'Some Unavailable': someUnavailableNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
