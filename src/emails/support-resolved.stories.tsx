import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { supportResolvedMessage } from './support-resolved';

// Render-only; content is asserted in tests/emails/support-resolved.test.tsx.
const meta = {
  title: 'Emails / Support Resolved',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Module-level, so the story hands the preview the same function every render.
const message = () =>
  supportResolvedMessage({
    to: 'someone@example.com',
    url: `${WORKSHOP_ORIGIN}/support`,
    origin: WORKSHOP_ORIGIN,
    requestSubject: 'The jar will not open',
    signedOut: true,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = {
  render: () => <EmailPreview message={message} />,
};
