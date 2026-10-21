import type { Meta, StoryObj } from '@storybook/nextjs-vite';
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
type Story = StoryObj<typeof meta>;

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
export const Default: Story = { render: () => <EmailPreview message={oneProvider} /> };

export const TwoProviders: Story = { render: () => <EmailPreview message={twoProviders} /> };

// No linked account on record: the sentence stops at the address.
export const NoProvider: Story = { render: () => <EmailPreview message={noProvider} /> };

// An existing account asking for this address (MB.54): the first sentence changes.
export const Change: Story = { render: () => <EmailPreview message={change} /> };
