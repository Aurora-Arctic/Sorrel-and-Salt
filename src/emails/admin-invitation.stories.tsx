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
// The dropdown story's `state` arg is the node it draws (see its argTypes mapping).
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

// The same mail inviting to the curator role (M11.20).
const curatorNode = <EmailPreview message={curatorMessage} />;

// One story with a control to choose the state: each is a whole page or list,
// too big to sit beside the others (claude-docs/workshop.md, rule 5).
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
