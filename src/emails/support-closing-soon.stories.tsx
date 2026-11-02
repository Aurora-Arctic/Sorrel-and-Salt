import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { supportClosingSoonMessage } from './support-closing-soon';

// Render-only; content is asserted in tests/emails/support-closing-soon.test.tsx.
const meta = {
  title: 'Emails / Support Closing Soon',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Module-level, so the story hands the preview the same function every render.
const message = () =>
  supportClosingSoonMessage({
    to: 'someone@example.com',
    url: `${WORKSHOP_ORIGIN}/support`,
    origin: WORKSHOP_ORIGIN,
    requestSubject: 'The jar will not open',
    signedOut: true,
    timeLeftMs: 2 * 24 * 60 * 60 * 1000,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = {
  render: () => <EmailPreview message={message} />,
};
