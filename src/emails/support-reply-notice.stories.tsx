import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { supportReplyNoticeMessage } from './support-reply-notice';

// Render-only; content is asserted in tests/emails/support-reply-notice.test.tsx.
const meta = {
  title: 'Emails / Support Reply Notice',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Module-level, so the story hands the preview the same function every render.
const notice = () =>
  supportReplyNoticeMessage({
    to: 'someone@example.com',
    url: `${WORKSHOP_ORIGIN}/account/support`,
    requestSubject: 'The jar will not open',
    origin: WORKSHOP_ORIGIN,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = {
  render: () => <EmailPreview message={notice} />,
};
