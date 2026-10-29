import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import MemberList from '.';
import ListFrame, { ListBody } from '../ListFrame';
import Notice from '../Notice';
import type { MemberListEntry } from './types';

// Render-only; behaviour is asserted in tests/components/MemberList. A
// member's view leaves the addresses out; an owner's draws them (M11.19). The
// controls are plain buttons standing in for the page's own, styled as the
// admin user table styles its own: Change Role quiet, Remove destructive.
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

const withActionsNode = (
  <MemberList
    members={MEMBERS}
    currentUserId="u-ada"
    showEmail
    roleAction={() => (
      <button type="button" className="btn btn--small btn--quiet">
        Change Role
      </button>
    )}
    removeAction={(member) =>
      member.role === 'owner' ? null : (
        <button type="button" className="btn btn--small btn--destructive">
          Remove
        </button>
      )
    }
  />
);

// The page's composition: the sole-owner note inside the list frame, ahead of
// the list, so the frame's gap spaces it (MB.119; src/app/(shell)/coven/[slug]/
// (people)/members/page.tsx). The note is the page's, not MemberList's.
const SoleOwnerPage = () => (
  <ListFrame>
    <Notice kind="warn" quiet>
      This coven has one owner. If that person loses access, nobody can manage its members. Make
      another member an owner to be safe.
    </Notice>
    <ListBody>
      <MemberList
        members={MEMBERS}
        currentUserId="u-ada"
        showEmail
        roleAction={() => (
          <button type="button" className="btn btn--small btn--quiet">
            Change Role
          </button>
        )}
        removeAction={(member) =>
          member.role === 'owner' ? null : (
            <button type="button" className="btn btn--small btn--destructive">
              Remove
            </button>
          )
        }
      />
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

// An owner's view with the addresses but no controls, as a viewer's page draws it.
const addressesOnlyNode = <MemberList members={MEMBERS} currentUserId="u-cy" showEmail />;

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'With Actions': withActionsNode,
  'Sole Owner': soleOwnerNode,
  'Gaps In The Record': gapsNode,
  'Addresses Without Actions': addressesOnlyNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
