import type { Story } from '@ladle/react';
import { usePressOnMount } from '../../../.ladle/press';
import { authClient } from '../../lib/auth-client';
import { LAST_USED_PROVIDER_COOKIE, signInErrorMessage } from '../../lib/sign-in';
import SignInPanel from '.';
import type { SignInPanelProps } from './types';

// Render-only; behaviour is asserted in tests/components/SignInPanel. Real
// sign-in requires a browser round trip through a real provider, so every
// story here fixes `configured` by hand rather than reading env.
export default {
  title: 'Sign In / Panel',
};

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

export const Default: Story = () => {
  lastUsed(null);
  return <Page next="/" configured={ALL_PROVIDERS} />;
};

// A browser that last signed in with Discord: its button carries the mark.
export const LastUsed: Story = () => {
  lastUsed('discord');
  return <Page next="/" configured={ALL_PROVIDERS} />;
};

// `error` reads the real mapping rather than a copied string, so this story
// cannot go stale the way a hardcoded copy of the sentence did.
export const WithError: Story = () => {
  lastUsed(null);
  return <Page next="/" error={signInErrorMessage('email_not_found')} configured={ALL_PROVIDERS} />;
};

// The shape most local dev actually sees: one registered pair in .env.local,
// the rest greyed out until their credentials are added.
export const SomeUnavailable: Story = () => {
  lastUsed(null);
  return <Page next="/" configured={['google']} />;
};

// A phone's width, in each theme, with the error and the mark both showing:
// the widest the panel gets, and the badge nearest the screen's edge.
export const PhoneDark: Story = () => {
  lastUsed('discord');
  return <Page next="/" error={signInErrorMessage('email_not_found')} configured={ALL_PROVIDERS} />;
};
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => {
  lastUsed('discord');
  return <Page next="/" error={signInErrorMessage('email_not_found')} configured={ALL_PROVIDERS} />;
};
PhoneLight.meta = { theme: 'light', width: 375 };

// Continue with Google pressed, as a person would, with the sign-in request
// left unanswered: that button reads "Signing In" and the others are disabled,
// as while the browser is on its way to the provider (M12.33).
export const SigningIn: Story = () => {
  lastUsed(null);
  usePressOnMount('Continue with Google');
  return <Page next="/" configured={ALL_PROVIDERS} />;
};
