import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { supportEmailReplyMessage } from './support-email-reply';

// Render-only; content is asserted in tests/emails/support-email-reply.test.tsx.
const meta = {
  title: 'Emails / Support Email Reply',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Module-level, so the story hands the preview the same function every render.
const message = () =>
  supportEmailReplyMessage({
    to: 'someone@example.com',
    url: `${WORKSHOP_ORIGIN}/support`,
    origin: WORKSHOP_ORIGIN,
    body: 'Open the recovery link in your latest email.',
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = {
  render: () => <EmailPreview message={message} />,
};
