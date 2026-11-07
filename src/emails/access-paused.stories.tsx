import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { accessPausedMessage } from './access-paused';

// Render-only; content is asserted in tests/emails/pause-notices.test.tsx.
const meta = {
  title: 'Emails / Access Paused',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const message = () =>
  accessPausedMessage({
    to: 'someone@example.com',
    url: 'https://sorrelandsalt.com/support',
    until: null,
    message: 'Your account is paused while we look into a report.',
    origin: WORKSHOP_ORIGIN,
  });

// With no end date and no message, the shortest the mail gets.
const bare = () =>
  accessPausedMessage({
    to: 'someone@example.com',
    url: 'https://sorrelandsalt.com/support',
    until: null,
    message: null,
    origin: WORKSHOP_ORIGIN,
  });

export const Default: Story = { render: () => <EmailPreview message={message} /> };

export const NoMessage: Story = { render: () => <EmailPreview message={bare} /> };
