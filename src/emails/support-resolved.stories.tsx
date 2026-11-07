import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { supportResolvedMessage } from './support-resolved';

const meta = {
  title: 'Emails / Support Resolved',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const message = () =>
  supportResolvedMessage({
    to: 'someone@example.com',
    url: `${WORKSHOP_ORIGIN}/support`,
    origin: WORKSHOP_ORIGIN,
    requestSubject: 'The jar will not open',
    signedOut: true,
  });

export const Default: Story = {
  render: () => <EmailPreview message={message} />,
};
