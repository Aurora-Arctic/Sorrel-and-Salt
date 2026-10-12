import type { Story } from '@ladle/react';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.ladle/EmailPreview';
import { covenInvitationMessage } from './coven-invitation';

// Render-only; content is asserted in tests/emails/coven-invitation.test.tsx.
// The link is invented and goes nowhere; the images and fonts come from the
// workshop, which serves public/.
export default {
  title: 'Emails / Coven invitation',
};

const URL = 'https://sorrelandsalt.com/invite/workshop-preview-token';

// Module-level, so each story hands the preview the same function every render.
const message = () =>
  covenInvitationMessage({
    to: 'someone@example.com',
    url: URL,
    covenName: 'Fixture Coven',
    role: 'member',
    origin: WORKSHOP_ORIGIN,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = () => <EmailPreview message={message} />;

// Pinned dark: what Gmail and any client that ignores the setting shows.
export const Dark: Story = () => <EmailPreview message={message} />;
Dark.meta = { theme: 'dark' };

export const Light: Story = () => <EmailPreview message={message} />;
Light.meta = { theme: 'light' };
