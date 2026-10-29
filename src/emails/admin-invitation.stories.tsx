import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import EmailPreview, { WORKSHOP_ORIGIN } from '../../.storybook/EmailPreview';
import { adminInvitationMessage } from './admin-invitation';

// Render-only; content is asserted in tests/emails/admin-invitation.test.tsx.
// The link is invented and goes nowhere; the images and fonts come from the
// workshop, which serves public/.
const meta = {
  title: 'Emails / Admin Invitation',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const URL = 'https://sorrelandsalt.com/invite/workshop-preview-token';

// Module-level, so each story hands the preview the same function every render.
const message = () =>
  adminInvitationMessage({
    to: 'someone@example.com',
    url: URL,
    siteRole: 'admin',
    inviterName: 'Fixture Owner',
    origin: WORKSHOP_ORIGIN,
  });

const curatorMessage = () =>
  adminInvitationMessage({
    to: 'someone@example.com',
    url: URL,
    siteRole: 'curator',
    inviterName: 'Fixture Owner',
    origin: WORKSHOP_ORIGIN,
  });

// Follows the toolbar's theme control, as the mail follows a reader's setting.
const defaultNode = <EmailPreview message={message} />;

// The same mail inviting to the curator role.
const curatorNode = <EmailPreview message={curatorMessage} />;

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Curator: curatorNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
