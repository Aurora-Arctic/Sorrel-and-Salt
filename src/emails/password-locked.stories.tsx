import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { passwordLockedMessage } from './password-locked';

// Render-only; content is asserted in tests/emails/password-locked.test.tsx. The link is invented and goes
// nowhere; the images and fonts come from the workshop, which serves public/.
const meta = {
  title: 'Emails / Password Locked',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Module-level, so the preview gets the same function every render.
const message = () =>
  passwordLockedMessage({
    to: 'someone@example.com',
    url: 'https://sorrelandsalt.com/api/auth/reset-password/example?callbackURL=%2Freset-password',
    minutes: 15,
    origin: WORKSHOP_ORIGIN,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = { render: () => <EmailPreview message={message} /> };
