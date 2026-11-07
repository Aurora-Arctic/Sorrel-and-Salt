import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { resetPasswordMessage } from './reset-password';

// Render-only; content is asserted in tests/emails/reset-password.test.tsx.
const meta = {
  title: 'Emails / Reset Password',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const message = () =>
  resetPasswordMessage({
    to: 'someone@example.com',
    url: 'https://sorrelandsalt.com/api/auth/reset-password/example?callbackURL=%2Freset-password',
    origin: WORKSHOP_ORIGIN,
  });

export const Default: Story = { render: () => <EmailPreview message={message} /> };
