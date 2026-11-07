import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { covenAccessPausedMessage } from './coven-access-paused';

const meta = {
  title: 'Emails / Coven Access Paused',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const message = () =>
  covenAccessPausedMessage({
    to: 'someone@example.com',
    url: 'https://sorrelandsalt.com/support',
    covenName: 'Testwort Circle',
    until: new Date('2099-03-14T12:00:00Z'),
    message: 'A short break from the coven while we talk.',
    origin: WORKSHOP_ORIGIN,
  });

const bare = () =>
  covenAccessPausedMessage({
    to: 'someone@example.com',
    url: 'https://sorrelandsalt.com/support',
    covenName: 'Testwort Circle',
    until: null,
    message: null,
    origin: WORKSHOP_ORIGIN,
  });

export const Default: Story = { render: () => <EmailPreview message={message} /> };

export const NoMessage: Story = { render: () => <EmailPreview message={bare} /> };
