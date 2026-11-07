import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { supportReplyNoticeMessage } from './support-reply-notice';

// Render-only; content is asserted in tests/emails/support-reply-notice.test.tsx.
const meta = {
  title: 'Emails / Support Reply Notice',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const notice = () =>
  supportReplyNoticeMessage({
    to: 'someone@example.com',
    url: `${WORKSHOP_ORIGIN}/account/support?request=00000000-0000-4000-8000-000000000000`,
    requestSubject: 'The jar will not open',
    origin: WORKSHOP_ORIGIN,
  });

export const Default: Story = {
  render: () => <EmailPreview message={notice} />,
};
