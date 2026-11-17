import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { InModal } from '../../../.storybook/in-modal';
import { answerOperations } from '../../../.storybook/mock-api';
import { makeQueryClient } from '../../lib/graphql-client';
import type { MemberListEntry } from '../MemberList/types';
import '../MemberList/index.scss';
import MemberDetail from '.';

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

const ownerNode = inDialog(
  BO,
  <MemberDetail workspaceId="w" member={BO} currentUserId="u-self" {...OWNER} />,
);

const pausedNode = inDialog(
  BO,
  <MemberDetail
    workspaceId="w"
    member={{ ...BO, role: 'viewer', paused: { until: new Date('2099-01-01T00:00:00Z') } }}
    currentUserId="u-self"
    {...OWNER}
  />,
);

const onOwnerNode = inDialog(
  BO,
  <MemberDetail
    workspaceId="w"
    member={{ ...BO, role: 'owner' }}
    currentUserId="u-self"
    {...OWNER}
  />,
);

const ownRowNode = inDialog(
  BO,
  <MemberDetail
    workspaceId="w"
    member={{ ...BO, role: 'owner' }}
    currentUserId={BO.userId}
    {...OWNER}
  />,
);

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

export const States: Story = {
  args: { state: 'Steward' },
  // The Coven Access panel reads the member's earlier pauses, so the page's request has an answer.
  beforeEach: ({ msw }) =>
    msw.use(
      answerOperations(({ operationName }) =>
        operationName === 'MemberPauses'
          ? { workspace: { id: 'w', memberPauses: { edges: [] } } }
          : undefined,
      ),
    ),
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
