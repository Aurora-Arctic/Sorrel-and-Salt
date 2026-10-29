import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { press, pressLast, useSteps } from '../../../.storybook/press';
import { route } from '../../../.storybook/route';
import { ShellFrame } from '../../../.storybook/shell-frame';
import InviteDialog from '../InviteDialog';
import TabbedPage from '../TabbedPage';
import PendingInvitations from '.';
import type { PendingInvitationEntry } from './types';

// Render-only; behaviour is asserted in tests/components/PendingInvitations.
const meta = {
  title: 'Coven / Invitations Sent',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const INVITATIONS: readonly PendingInvitationEntry[] = [
  {
    id: 'i-1',
    email: 'fern@fixture.test',
    role: 'member',
    expiresAt: new Date('2026-10-19'),
    declinedAt: null,
  },
  {
    id: 'i-2',
    email: 'moss@fixture.test',
    role: 'viewer',
    expiresAt: new Date('2026-10-18'),
    declinedAt: null,
  },
];

const defaultNode = <PendingInvitations workspaceId="w" invitations={INVITATIONS} />;

const WithDeclinedView = () => (
  <PendingInvitations
    workspaceId="w"
    invitations={[
      ...INVITATIONS,
      {
        id: 'i-3',
        email: 'sage@fixture.test',
        role: 'viewer',
        expiresAt: new Date('2026-10-20'),
        declinedAt: new Date('2026-10-14T09:30:00Z'),
      },
    ]}
  />
);

const withDeclinedNode = <WithDeclinedView />;

// The page as the coven's people layout draws it for an owner: the shell, the
// Members heading, the Members and Invitations toggle with Invitations open, and
// Invite at the heading's end (src/app/(shell)/coven/[slug]/(people)/layout.tsx).
const emptyNode = (
  <ShellFrame area="coven" open="/coven/fixture-coven/invitations">
    <TabbedPage
      title="Members"
      tabs={[
        { href: route('/coven/fixture-coven/members'), label: 'Members' },
        { href: route('/coven/fixture-coven/invitations'), label: 'Invitations' },
      ]}
      action={<InviteDialog workspaceId="w" />}
    >
      <PendingInvitations workspaceId="w" invitations={[]} />
    </TabbedPage>
  </ShellFrame>
);

// The middle page of three, both pager ends live.
const pagedNode = (
  <PendingInvitations
    workspaceId="w"
    invitations={INVITATIONS}
    previousHref="/coven/fixture-coven/members?before=cursor"
    nextHref="/coven/fixture-coven/members?after=cursor"
    position={{ page: 2, pages: 3 }}
  />
);

// Revoke pressed, then confirmed: no server answers, so the refusal shows under the row's button.
const RevokeRefusedView = () => {
  useSteps([() => press('Revoke the invitation to fern@fixture.test'), () => pressLast('Revoke')]);
  return <PendingInvitations workspaceId="w" invitations={[INVITATIONS[0]]} />;
};
const revokeRefusedNode = <RevokeRefusedView />;

const RemoveRefusedView = () => {
  useSteps([
    () => press('Remove the declined invitation to sage@fixture.test'),
    () => pressLast('Remove'),
  ]);
  return (
    <PendingInvitations
      workspaceId="w"
      invitations={[
        {
          id: 'i-3',
          email: 'sage@fixture.test',
          role: 'viewer',
          expiresAt: new Date('2026-10-20'),
          declinedAt: new Date('2026-10-14T09:30:00Z'),
        },
      ]}
    />
  );
};
const removeRefusedNode = <RemoveRefusedView />;

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'With Declined': withDeclinedNode,
  Empty: emptyNode,
  'Middle Page': pagedNode,
  'Revoke Refused': revokeRefusedNode,
  'Remove Refused': removeRefusedNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
