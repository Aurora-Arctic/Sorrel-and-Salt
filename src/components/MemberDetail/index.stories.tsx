import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { InModal } from '../../../.storybook/in-modal';
import { makeQueryClient } from '../../lib/graphql-client';
import type { MemberListEntry } from '../MemberList/types';
import '../MemberList/index.scss';
import MemberDetail from '.';

// Render-only; behaviour is asserted in tests/components/MemberDetail. Coven Access reads the member's earlier pauses,
// which the workshop does not serve, so its list stays empty here.
const meta = {
  title: 'Coven / Member Detail',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const BO: MemberListEntry = {
  userId: 'u-bo',
  name: 'Bo Fixturewort',
  role: 'member',
  joinedAt: new Date('2026-03-04T05:06:07Z'),
  invitedBy: 'Ash Warden',
  updatedBy: 'Ivy Keeper',
  updatedAt: new Date('2026-04-05T06:07:08Z'),
  email: 'bo@fixture.test',
  paused: null,
};
const OWNER = { canChangeRoles: true, canPause: true, canRemove: true };

// The dialog the members page opens: Member over the name, the address beneath it for a steward. The head is the page's
// member-heading.tsx, written out here.
const inDialog = (member: MemberListEntry, body: ReactNode, email = true): ReactNode => (
  <QueryClientProvider client={makeQueryClient()}>
    <InModal
      eyebrow="Member"
      title={member.name}
      qualifier={
        email ? <span className="member-list__modal-email">{member.email}</span> : undefined
      }
    >
      {body}
    </InModal>
  </QueryClientProvider>
);

// A steward on a member: Change Role, Coven Access and a plain Remove.
const ownerNode = inDialog(
  BO,
  <MemberDetail workspaceId="w" member={BO} currentUserId="u-self" {...OWNER} />,
);

// A steward on a paused member: the standing pause with Lift Pause.
const pausedNode = inDialog(
  BO,
  <MemberDetail
    workspaceId="w"
    member={{ ...BO, role: 'viewer', paused: { until: new Date('2099-01-01T00:00:00Z') } }}
    currentUserId="u-self"
    {...OWNER}
  />,
);

// A steward on another steward: no Coven Access, as a steward's access is never paused.
const onOwnerNode = inDialog(
  BO,
  <MemberDetail
    workspaceId="w"
    member={{ ...BO, role: 'owner' }}
    currentUserId="u-self"
    {...OWNER}
  />,
);

// A steward on their own row: no Remove.
const ownRowNode = inDialog(
  BO,
  <MemberDetail
    workspaceId="w"
    member={{ ...BO, role: 'owner' }}
    currentUserId={BO.userId}
    {...OWNER}
  />,
);

// A practitioner opening a row: the facts alone, with no address in the head.
const asMemberNode = inDialog(
  BO,
  <MemberDetail workspaceId="w" member={{ ...BO, email: null }} currentUserId="u-self" />,
  false,
);

const STATES_STATES: Record<string, ReactNode> = {
  Steward: ownerNode,
  Paused: pausedNode,
  'On a Steward': onOwnerNode,
  'Own Row': ownRowNode,
  'As a Practitioner': asMemberNode,
};

// In its own iframe: `showModal()` puts the dialog in the top layer.
export const States: Story = {
  args: { state: 'Steward' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
