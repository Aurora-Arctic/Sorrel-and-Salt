import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { covenAccessPausedMessage } from './coven-access-paused';

// Render-only; content is asserted in tests/emails/pause-notices.test.tsx. The link is invented and goes
// nowhere; the images and fonts come from the workshop, which serves public/.
const meta = {
  title: 'Emails / Coven Access Paused',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Module-level, so the preview gets the same function every render.
const message = () =>
  covenAccessPausedMessage({
    to: 'someone@example.com',
    url: 'https://sorrelandsalt.com/support',
    covenName: 'Testwort Circle',
    until: new Date('2099-03-14T12:00:00Z'),
    note: 'Cooling off after the argument.',
    origin: WORKSHOP_ORIGIN,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = { render: () => <EmailPreview message={message} /> };
