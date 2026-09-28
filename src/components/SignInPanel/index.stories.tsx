import type { Story } from '@ladle/react';
import { authClient } from '../../lib/auth-client';
import { LAST_USED_PROVIDER_COOKIE, signInErrorMessage } from '../../lib/sign-in';
import SignInPanel from '.';

// Render-only; behaviour is asserted in tests/components/SignInPanel. Real
// sign-in requires a browser round trip through a real provider, so every
// story here fixes `configured` by hand rather than reading env.
export default {
  title: 'Sign In Panel',
};

const ALL_PROVIDERS = ['discord', 'google', 'facebook', 'microsoft'] as const;

// The panel reads the last-used mark from the workshop's own cookie, which
// outlives the story that wrote it, so every story sets or clears it first.
function lastUsed(provider: (typeof ALL_PROVIDERS)[number] | null): void {
  if (provider) document.cookie = `${LAST_USED_PROVIDER_COOKIE}=${provider}; path=/`;
  else authClient.clearLastUsedLoginMethod();
}

export const Default: Story = () => {
  lastUsed(null);
  return <SignInPanel next="/" configured={ALL_PROVIDERS} />;
};

// A browser that last signed in with Discord: its button carries the mark.
export const LastUsed: Story = () => {
  lastUsed('discord');
  return <SignInPanel next="/" configured={ALL_PROVIDERS} />;
};

// `error` reads the real mapping rather than a copied string, so this story
// cannot go stale the way a hardcoded copy of the sentence did.
export const WithError: Story = () => {
  lastUsed(null);
  return (
    <SignInPanel
      next="/"
      error={signInErrorMessage('email_not_found')}
      configured={ALL_PROVIDERS}
    />
  );
};

// The shape most local dev actually sees: one registered pair in .env.local,
// the rest greyed out until their credentials are added.
export const SomeUnavailable: Story = () => {
  lastUsed(null);
  return <SignInPanel next="/" configured={['google']} />;
};
