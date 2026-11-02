import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { accessPausedMessage } from './access-paused';

// Render-only; content is asserted in tests/emails/pause-notices.test.tsx. The link is invented and goes
// nowhere; the images and fonts come from the workshop, which serves public/.
const meta = {
  title: 'Emails / Access Paused',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Module-level, so the preview gets the same function every render.
const message = () =>
  accessPausedMessage({
    to: 'someone@example.com',
    url: 'https://sorrelandsalt.com/support',
    until: null,
    note: 'Repeated off-topic requests.',
    origin: WORKSHOP_ORIGIN,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = { render: () => <EmailPreview message={message} /> };
