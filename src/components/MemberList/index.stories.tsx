import type { Story } from '@ladle/react';
import MemberList from '.';
import type { MemberListEntry } from './types';

// Render-only; behaviour is asserted in tests/components/MemberList. The
// controls are plain buttons standing in for the page's own, styled as the
// admin user table styles its own: Change Role quiet, Remove destructive.
export default {
  title: 'Coven / Member List',
};

const MEMBERS: readonly MemberListEntry[] = [
  { userId: 'u-ada', name: 'Ada Fixturewort', role: 'owner', joinedAt: new Date('2026-03-04') },
  { userId: 'u-bo', name: 'Bo Fixturewort', role: 'member', joinedAt: new Date('2026-05-06') },
  { userId: 'u-cy', name: 'Cy Fixturewort', role: 'viewer', joinedAt: new Date('2026-06-07') },
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
