import type { Story } from '@ladle/react';
import MemberList from '.';
import ListFrame, { ListBody } from '../ListFrame';
import Notice from '../Notice';
import type { MemberListEntry } from './types';

// Render-only; behaviour is asserted in tests/components/MemberList. The
// controls are plain buttons standing in for the page's own, styled as the
// admin user table styles its own: Change Role quiet, Remove destructive.
export default {
  title: 'Coven / Member List',
};

const MEMBERS: readonly MemberListEntry[] = [
  {
    userId: 'u-ada',
    name: 'Ada Fixturewort',
    role: 'owner',
    joinedAt: new Date('2026-03-04'),
    updatedBy: 'Ada Fixturewort',
    updatedAt: new Date('2026-03-04'),
    invitedBy: null,
  },
  {
    userId: 'u-bo',
    name: 'Bo Fixturewort',
    role: 'member',
    joinedAt: new Date('2026-05-06'),
    updatedBy: 'Ada Fixturewort',
    updatedAt: new Date('2026-05-06'),
    invitedBy: 'Ada Fixturewort',
  },
  {
    userId: 'u-cy',
    name: 'Cy Fixturewort',
    role: 'viewer',
    joinedAt: new Date('2026-06-07'),
    updatedBy: 'Ada Fixturewort',
    updatedAt: new Date('2026-06-07'),
    invitedBy: 'Bo Fixturewort',
  },
];

export const ReadOnly: Story = () => <MemberList members={MEMBERS} currentUserId="u-bo" />;

export const WithActions: Story = () => (
  <MemberList
    members={MEMBERS}
    currentUserId="u-ada"
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

export const SoleOwner: Story = () => <SoleOwnerPage />;

export const SoleOwnerPhoneDark: Story = () => <SoleOwnerPage />;
SoleOwnerPhoneDark.meta = { theme: 'dark', width: 375 };

export const SoleOwnerPhoneLight: Story = () => <SoleOwnerPage />;
SoleOwnerPhoneLight.meta = { theme: 'light', width: 375 };
