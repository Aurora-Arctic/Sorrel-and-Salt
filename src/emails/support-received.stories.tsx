import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { supportReceivedMessage } from './support-received';

// Render-only; content is asserted in tests/emails/support-received.test.tsx.
const meta = {
  title: 'Emails / Support Received',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Module-level, so the story hands the preview the same function every render.
const message = () =>
  supportReceivedMessage({
    to: 'someone@example.com',
    url: `${WORKSHOP_ORIGIN}/support`,
    origin: WORKSHOP_ORIGIN,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = {
  render: () => <EmailPreview message={message} />,
};
