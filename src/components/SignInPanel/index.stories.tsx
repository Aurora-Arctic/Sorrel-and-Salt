import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { usePressOnMount } from '../../../.storybook/press';
import { authClient } from '../../lib/auth-client';
import { LAST_USED_PROVIDER_COOKIE, signInErrorMessage } from '../../lib/sign-in';
import SignInPanel from '.';
import type { SignInPanelProps } from './types';

// Behaviour is asserted in tests/components/SignInPanel. Real
// sign-in requires a browser round trip through a real provider, so every
// story here fixes `configured` by hand rather than reading env.
const meta = {
  title: 'Sign In / Panel',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const ALL_PROVIDERS = ['discord', 'google', 'facebook', 'microsoft'] as const;

// The panel reads the last-used mark from the workshop's own cookie, which
// outlives the story that wrote it, so every story sets or clears it first.
function lastUsed(provider: (typeof ALL_PROVIDERS)[number] | null): void {
  if (provider) document.cookie = `${LAST_USED_PROVIDER_COOKIE}=${provider}; path=/`;
  else authClient.clearLastUsedLoginMethod();
}

// Inside the page's own frame (src/app/sign-in/page.tsx), so the workshop
// shows what the page shows.
const Page = (props: SignInPanelProps) => (
  <main className="page-frame page-frame--narrow">
    <SignInPanel {...props} />
  </main>
);

export const Default: Story = {
  render: () => {
    lastUsed(null);
    return <Page next="/" configured={ALL_PROVIDERS} />;
  },
};

// A browser that last signed in with Discord: its button carries the mark.
export const LastUsed: Story = {
  render: () => {
    lastUsed('discord');
    return <Page next="/" configured={ALL_PROVIDERS} />;
  },
};

// `error` reads the real mapping rather than a copied string, so this story
// cannot go stale the way a hardcoded copy of the sentence did.
export const WithError: Story = {
  render: () => {
    lastUsed(null);
    return (
      <Page next="/" error={signInErrorMessage('email_not_found')} configured={ALL_PROVIDERS} />
    );
  },
};

// The shape most local dev actually sees: one registered pair in .env.local,
// the rest greyed out until their credentials are added.
export const SomeUnavailable: Story = {
  render: () => {
    lastUsed(null);
    return <Page next="/" configured={['google']} />;
  },
};

// Continue with Google pressed, as a person would, with the sign-in request
// left unanswered: that button reads "Signing In" and the others are disabled,
// as while the browser is on its way to the provider (M12.33).
export const Pending: Story = {
  render: () => {
    lastUsed(null);
    usePressOnMount('Continue with Google');
    return <Page next="/" configured={ALL_PROVIDERS} />;
  },
};

// Continue with Google pressed, as a person would: the workshop serves no
// /api/auth, so the sign-in fails before any redirect, into its callout under
// that button, with the badge on it (claude-docs/components/click-feedback.md).
export const Failed: Story = {
  render: () => {
    lastUsed(null);
    usePressOnMount('Continue with Google');
    return <Page next="/" configured={ALL_PROVIDERS} />;
  },
};
