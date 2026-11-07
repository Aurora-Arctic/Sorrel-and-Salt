import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import MemberList from '.';
import ListFrame, { ListBody } from '../ListFrame';
import Notice from '../Notice';
import type { MemberListEntry } from './types';

const meta = {
  title: 'Coven / Member List',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const MEMBERS: readonly MemberListEntry[] = [
  {
    userId: 'u-ada',
    name: 'Ada Fixturewort',
    role: 'owner',
    joinedAt: new Date('2026-03-04'),
    updatedBy: 'Ada Fixturewort',
    updatedAt: new Date('2026-03-04'),
    invitedBy: null,
    email: 'ada@fixture.test',
  },
  {
    userId: 'u-bo',
    name: 'Bo Fixturewort',
    role: 'member',
    joinedAt: new Date('2026-05-06'),
    updatedBy: 'Ada Fixturewort',
    updatedAt: new Date('2026-05-06'),
    invitedBy: 'Ada Fixturewort',
    email: 'bo@fixture.test',
  },
  {
    userId: 'u-cy',
    name: 'Cy Fixturewort',
    role: 'viewer',
    joinedAt: new Date('2026-06-07'),
    updatedBy: 'Ada Fixturewort',
    updatedAt: new Date('2026-06-07'),
    invitedBy: 'Bo Fixturewort',
    email: 'cy@fixture.test',
  },
];

const defaultNode = <MemberList members={MEMBERS} currentUserId="u-bo" />;

const OWNER_VIEW: readonly MemberListEntry[] = MEMBERS.map((member) => ({
  ...member,
  paused: member.role === 'viewer' ? { until: null } : null,
}));

const ownerViewNode = (
  <MemberList members={OWNER_VIEW} currentUserId="u-ada" showEmail showAccess />
);

const SoleOwnerPage = () => (
  <ListFrame>
    <Notice kind="warn" quiet>
      This coven has one steward. If that person loses access, nobody can manage its members. Make
      another member a steward to be safe.
    </Notice>
    <ListBody>
      <MemberList members={OWNER_VIEW} currentUserId="u-ada" showEmail showAccess />
    </ListBody>
  </ListFrame>
);

const soleOwnerNode = <SoleOwnerPage />;

const gapsNode = (
  <MemberList
    members={[
      { ...MEMBERS[0], email: null },
      { ...MEMBERS[1], email: null, updatedBy: null, updatedAt: null },
      MEMBERS[2],
    ]}
    currentUserId="u-ada"
    showEmail
  />
);

const addressesOnlyNode = <MemberList members={MEMBERS} currentUserId="u-cy" showEmail />;

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Steward View': ownerViewNode,
  'Sole Steward': soleOwnerNode,
  'Gaps In The Record': gapsNode,
  'Addresses Without Actions': addressesOnlyNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
