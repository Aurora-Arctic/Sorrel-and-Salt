import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { supportReceivedMessage } from './support-received';

const meta = {
  title: 'Emails / Support Received',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const message = () =>
  supportReceivedMessage({
    to: 'someone@example.com',
    url: `${WORKSHOP_ORIGIN}/support`,
    origin: WORKSHOP_ORIGIN,
    requestSubject: 'The jar will not open',
    signedOut: true,
  });

export const Default: Story = {
  render: () => <EmailPreview message={message} />,
};
