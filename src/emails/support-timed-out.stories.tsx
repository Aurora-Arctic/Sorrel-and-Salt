import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { supportTimedOutMessage } from './support-timed-out';

// Render-only; content is asserted in tests/emails/pause-notices.test.tsx. The link is invented and goes
// nowhere; the images and fonts come from the workshop, which serves public/.
const meta = {
  title: 'Emails / Support Timed Out',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Module-level, so the preview gets the same function every render.
const message = () =>
  supportTimedOutMessage({
    to: 'someone@example.com',
    url: 'https://sorrelandsalt.com/support',
    until: new Date('2099-03-14T12:00:00Z'),
    message: 'Please keep each request to one problem.',
    origin: WORKSHOP_ORIGIN,
  });

// With no end date and no message, the shortest the mail gets.
const bare = () =>
  supportTimedOutMessage({
    to: 'someone@example.com',
    url: 'https://sorrelandsalt.com/support',
    until: null,
    message: null,
    origin: WORKSHOP_ORIGIN,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = { render: () => <EmailPreview message={message} /> };

export const NoMessage: Story = { render: () => <EmailPreview message={bare} /> };
