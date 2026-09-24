import type { Story } from '@ladle/react';
import { signInErrorMessage } from '../../lib/sign-in';
import SignInPanel from '.';

// Render-only; behaviour is asserted in tests/components/SignInPanel. Real
// sign-in requires a browser round trip through a real provider, so every
// story here fixes `configured` by hand rather than reading env.
export default {
  title: 'SignInPanel',
};

const ALL_PROVIDERS = ['discord', 'google', 'facebook', 'microsoft'] as const;

export const Default: Story = () => <SignInPanel next="/" configured={ALL_PROVIDERS} />;

// `error` reads the real mapping rather than a copied string, so this story
// cannot go stale the way a hardcoded copy of the sentence did.
export const WithError: Story = () => (
  <SignInPanel next="/" error={signInErrorMessage('email_not_found')} configured={ALL_PROVIDERS} />
);

// The shape most local dev actually sees: one registered pair in .env.local,
// the rest greyed out until their credentials are added.
export const SomeUnavailable: Story = () => <SignInPanel next="/" configured={['google']} />;
