import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { covenInvitationMessage } from './coven-invitation';

// Render-only; content is asserted in tests/emails/coven-invitation.test.tsx.
// The link is invented and goes nowhere; the images and fonts come from the
// workshop, which serves public/.
const meta = {
  title: 'Emails / Coven Invitation',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const URL = 'https://sorrelandsalt.com/invite/workshop-preview-token';

// Module-level, so each story hands the preview the same function every render.
const message = () =>
  covenInvitationMessage({
    to: 'someone@example.com',
    url: URL,
    covenName: 'Fixture Coven',
    role: 'member',
    inviterName: 'Fixture Owner',
    origin: WORKSHOP_ORIGIN,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = { render: () => <EmailPreview message={message} /> };
