import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { documentUpdatedMessage } from './document-updated';

// Render-only; the mail's content is asserted in tests/modules/documents/jobs.
const meta = {
  title: 'Emails / Document Updated',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Module-level, so the story hands the preview the same function every render.
const message = () =>
  documentUpdatedMessage({
    to: 'someone@example.com',
    url: `${WORKSHOP_ORIGIN}/terms`,
    origin: WORKSHOP_ORIGIN,
    documents: [
      {
        title: 'Terms of Use',
        summary: 'We now keep sign-in records for ninety days.',
        url: `${WORKSHOP_ORIGIN}/terms`,
      },
      {
        title: 'Privacy Policy',
        summary: 'We name the mail provider that sends our email.',
        url: `${WORKSHOP_ORIGIN}/privacy`,
      },
    ],
    asksAgreement: true,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
export const Default: Story = {
  render: () => <EmailPreview message={message} />,
};
