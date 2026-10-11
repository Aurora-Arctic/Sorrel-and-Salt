import type { Story } from '@ladle/react';
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

// Proposals (MB.116) for the owner's calls, each a pair; the losing story of
// each pair, and any style only it uses, goes once the call is made.

// A panel behind the form or bare: the same page on the card surface.
export const ProposalPanelOn: Story = () => {
  lastUsed(null);
  return <Page next="/" configured={ALL_PROVIDERS} className="panel" />;
};

export const ProposalPanelOff: Story = () => {
  lastUsed(null);
  return <Page next="/" configured={ALL_PROVIDERS} />;
};

// The last-used badge hanging off the button's corner (today's), or inline
// after the label. At a phone's width, where the corner is nearest the edge.
export const ProposalBadgeCorner: Story = () => {
  lastUsed('discord');
  return <Page next="/" configured={ALL_PROVIDERS} />;
};
ProposalBadgeCorner.meta = { width: 375 };

export const ProposalBadgeInline: Story = () => {
  lastUsed('discord');
  return <Page next="/" configured={ALL_PROVIDERS} className="sign-in-panel--badge-inline" />;
};
ProposalBadgeInline.meta = { width: 375 };

// Microsoft's white button on the light page: with the #808080 edge, or as
// Microsoft's own dark button. The call is about the light theme only.
export const ProposalMicrosoftEdge: Story = () => {
  lastUsed(null);
  return <Page next="/" configured={ALL_PROVIDERS} />;
};
ProposalMicrosoftEdge.meta = { theme: 'light' };

export const ProposalMicrosoftDark: Story = () => {
  lastUsed(null);
  return <Page next="/" configured={ALL_PROVIDERS} className="sign-in-panel--microsoft-dark" />;
};
ProposalMicrosoftDark.meta = { theme: 'light' };
