import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import MemberList from '.';
import ListFrame, { ListBody } from '../ListFrame';
import Notice from '../Notice';
import type { MemberListEntry } from './types';

// Render-only; behaviour is asserted in tests/components/MemberList. A member's
// view leaves the addresses out; an owner's draws them and the Access column, where the
// viewer's row shows a standing pause. No row holds an action: the member modal does.
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

// An owner's view: the addresses, and the viewer's standing pause in the Access column. The rows hold no actions;
// those are the member modal's (Coven / Member Detail).
const OWNER_VIEW: readonly MemberListEntry[] = MEMBERS.map((member) => ({
  ...member,
  paused: member.role === 'viewer' ? { until: null } : null,
}));

const ownerViewNode = (
  <MemberList members={OWNER_VIEW} currentUserId="u-ada" showEmail showAccess />
);

// The page's composition: the sole-owner note inside the list frame, ahead of
// the list, so the frame's gap spaces it (src/app/(shell)/coven/[slug]/
// (people)/members/page.tsx). The note is the page's, not MemberList's.
const SoleOwnerPage = () => (
  <ListFrame>
    <Notice kind="warn" quiet>
      This coven has one owner. If that person loses access, nobody can manage its members. Make
      another member an owner to be safe.
    </Notice>
    <ListBody>
      <MemberList members={OWNER_VIEW} currentUserId="u-ada" showEmail showAccess />
    </ListBody>
  </ListFrame>
);

const soleOwnerNode = <SoleOwnerPage />;

// An owner's view where an address is not on file and the editor's name is withheld.
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

// The addresses without the Access column.
const addressesOnlyNode = <MemberList members={MEMBERS} currentUserId="u-cy" showEmail />;

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Owner View': ownerViewNode,
  'Sole Owner': soleOwnerNode,
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
