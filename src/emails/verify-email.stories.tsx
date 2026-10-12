import type { Story } from '@ladle/react';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.ladle/EmailPreview';
import { verifyEmailMessage } from './verify-email';
import type { ProviderId } from '../lib/types';

// Render-only; content is asserted in tests/emails/verify-email.test.tsx. The
// link is invented and goes nowhere; the images and fonts come from the
// workshop, which serves public/.
export default {
  title: 'Emails / Verify email',
};

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
export const Default: Story = () => <EmailPreview message={oneProvider} />;

export const TwoProviders: Story = () => <EmailPreview message={twoProviders} />;

// No linked account on record: the sentence stops at the address.
export const NoProvider: Story = () => <EmailPreview message={noProvider} />;

// An existing account asking for this address (MB.54): the first sentence changes.
export const Change: Story = () => <EmailPreview message={change} />;

// Pinned dark: what Gmail and any client that ignores the setting shows.
export const Dark: Story = () => <EmailPreview message={oneProvider} />;
Dark.meta = { theme: 'dark' };

export const Light: Story = () => <EmailPreview message={oneProvider} />;
Light.meta = { theme: 'light' };
