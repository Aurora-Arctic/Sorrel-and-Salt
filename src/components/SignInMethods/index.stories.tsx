import type { Story } from '@ladle/react';
import { linkErrorMessage } from '../../lib/sign-in';
import SignInMethods from '.';
import type { LinkedAccount, ProviderId } from '../../lib/types';
import type { SignInMethodsProps } from './types';

// Render-only; behaviour is asserted in tests/components/SignInMethods. Adding
// or removing here reaches for /api/auth, which the workshop does not serve,
// so a click fails into the alert region — a state worth seeing in itself.
export default {
  title: 'Sign In Methods',
};

const ALL_PROVIDERS: readonly ProviderId[] = ['discord', 'google', 'facebook', 'microsoft'];
const DISCORD: LinkedAccount = { id: 'a-discord', providerId: 'discord' };
const MICROSOFT: LinkedAccount = { id: 'a-microsoft', providerId: 'microsoft' };

// Inside the page's own frame, so the workshop shows what the page shows.
const Page = (props: SignInMethodsProps) => (
  <main className="account-page">
    <SignInMethods {...props} />
  </main>
);

// The common first visit: the one provider the account was made with, which
// cannot be removed while it is the only one.
export const OneLinked: Story = () => <Page linked={[DISCORD]} configured={ALL_PROVIDERS} />;

export const TwoLinked: Story = () => (
  <Page linked={[DISCORD, MICROSOFT]} configured={ALL_PROVIDERS} />
);

// `error` reads the real mapping rather than a copied string.
export const WithError: Story = () => (
  <Page
    linked={[DISCORD]}
    configured={ALL_PROVIDERS}
    error={linkErrorMessage('account_already_linked_to_different_user')}
  />
);

// Local dev with one registered pair: the rest cannot be added.
export const SomeUnavailable: Story = () => <Page linked={[DISCORD]} configured={['discord']} />;
