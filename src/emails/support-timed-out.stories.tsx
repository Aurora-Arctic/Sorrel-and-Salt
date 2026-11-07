import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { supportTimedOutMessage } from './support-timed-out';

// Render-only; content is asserted in tests/emails/pause-notices.test.tsx.
const meta = {
  title: 'Emails / Support Timed Out',
} satisfies Meta;
export default meta;
type Story = StoryObj;

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

export const Default: Story = { render: () => <EmailPreview message={message} /> };

export const NoMessage: Story = { render: () => <EmailPreview message={bare} /> };
